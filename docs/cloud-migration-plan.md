# Cloud Migration Plan — GitHub-as-master + Public URL + Mobile

**Goal:** Everything lives in GitHub (source of truth). The app is reachable on a public URL from
desktop and mobile. All future work flows through GitHub (branch → PR → CI → merge → auto-deploy).

**Chosen stack (Railway-only backend — decided 2026-07-11):**

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend (React/Vite SPA) | **Vercel** | Auto-deploys from GitHub, global CDN, instant HTTPS + custom domain |
| Backend (Express + Prisma + node-cron) | **Railway** | Always-on container → runs the Express app **and** the cron sync jobs unchanged |
| Database | **Railway Postgres** | Co-located with the backend (low latency for cron + report aggregates), usage-based storage, one bill |
| File uploads | **Railway Volume** | Persistent disk mounted on the backend; the upload flow needs no object-storage SDK |
| Mobile | **Responsive web + PWA** | Public URL works in any mobile browser; PWA adds "install to home screen" |

**Supabase is dropped from the stack.** Railway Postgres holds the data and a Railway Volume holds the
one 60 KB upload, so the whole app is just **Vercel + Railway** — two vendors, two accounts, one backend bill.

Data decision: **migrate the existing ~1.8 GB of local data** into Railway Postgres (keep full history — the
telematics data powers the month-on-month / patterns / scorecard reports, so we do **not** prune).

---

## Current-state summary (analysis)

- ✅ Already on GitHub: `github.com/dewet-debug/fleet-management`, `master` in sync.
- ✅ Outstanding Reports feature + repo hygiene committed in **PR #12** (merge this first).
- ✅ Schema is clean for Postgres: 37 models, **no `Json`/`Decimal`/`Bytes`** fields.
- ⚠️ DB is SQLite (a local file) — the core thing to replace.
- ⚠️ ~1.8 GB of data, almost all telematics history in the `Cartrack*` tables.
- ⚠️ Auth cookies are `sameSite: 'strict'` and CORS is `origin: true` — both must change for a
  cross-origin (Vercel ↔ Railway) deployment.
- ⚠️ Uploads write to a local `./uploads` dir (one 60 KB file today) — must move onto a Railway Volume
  (container disks are otherwise ephemeral).

---

## Phase 0 — Merge PR #12 (secures local-only work) ✅ ready

Merge `chore/secure-work-and-cloud-prep` → `master`. This puts the Reports feature in GitHub and
stops tracking the 1.8 GB `dev.db`. The physical `dev.db` stays on disk as the **source for the data
migration in Phase 2** — do not delete it.

---

## Phase 1 — SQLite → Postgres (schema)

**Code changes (I do these on a branch):**

1. `server/prisma/schema.prisma`: `provider = "sqlite"` → `"postgresql"`; add a `directUrl` for
   migrations:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")   // pooled (pgBouncer) — used at runtime
     directUrl = env("DIRECT_URL")     // direct connection — used for migrations
   }
   ```
2. Reset the migration history for Postgres. The existing three migrations are SQLite SQL and won't
   apply to Postgres. Archive them and generate one fresh baseline:
   `prisma migrate dev --name init` against a Postgres shadow DB.
3. `prisma generate` → new client.

**Risk:** Low. No SQLite-specific column types are in use (enums are already modelled as `String`).

---

## Phase 2 — Migrate the 1.8 GB of data

**Recommended tool: `pgloader`** (purpose-built SQLite→Postgres bulk migration; handles this size).
Fallback: a table-by-table Node script using two Prisma clients.

Steps:
1. Stand up the empty Postgres DB with the Phase-1 schema (`prisma migrate deploy`).
2. `pgloader ./server/prisma/dev.db postgresql://…` (with a load file that skips Prisma's
   `_prisma_migrations` table).
3. Verify: compare row counts per table (SQLite vs Postgres) for the big `Cartrack*` tables.

**Storage decision (settled):** use **Railway Postgres** and **keep the full 1.8 GB history.** Railway
storage is usage-based (~a few $/mo for 1.8 GB), co-located with the backend, and on the same bill —
so there's no reason to prune. Pruning was only attractive to squeeze under Supabase Free's 500 MB cap,
which no longer applies.

---

## Phase 3 — Uploads → Railway Volume

- Provision a **Railway Volume** and mount it at the path the app already writes to (e.g. `/data/uploads`);
  point the upload dir at that mount via an env var (`UPLOAD_DIR`).
- The existing multer → local-disk flow and `express.static` serving stay **as-is** — the code doesn't
  change, only the target directory becomes a persistent mount instead of the ephemeral container disk.
- Copy the existing file(s) from `server/uploads/` onto the volume once (trivial — one 60 KB file today).

---

## Phase 4 — Deploy backend to Railway

1. Railway project → **Deploy from GitHub repo**, root = `server/` (Nixpacks auto-detects Node; add a
   `Dockerfile` only if we want full control).
2. Build `npm run build`; start `node dist/index.js`; release command `prisma migrate deploy`.
3. Env vars (from `server/.env.example`): `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`,
   `JWT_REFRESH_SECRET`, `CARTRACK_*`, `BOLT_*`, `CARTRACK_ENCRYPTION_KEY`, `NODE_ENV=production`,
   `UPLOAD_DIR` (the Railway Volume mount path), and `CLIENT_ORIGIN` (the Vercel URL).
   Railway injects `DATABASE_URL`/`DIRECT_URL` automatically when you add the Postgres plugin.
4. **Required auth fixes (cross-origin):**
   - `cors({ origin: true })` → `cors({ origin: process.env.CLIENT_ORIGIN, credentials: true })`.
   - Auth cookies `sameSite: 'strict'` → `sameSite: 'none'` **and** `secure: true` in production
     (otherwise the browser drops the cookie between the Vercel and Railway domains).
5. `node-cron` runs in-process on Railway's always-on service — **no rework**. (Railway does not
   sleep an active service the way some free tiers do.)

---

## Phase 5 — Deploy frontend to Vercel

1. Vercel project → import GitHub repo, root = `client/`, framework = Vite (build `npm run build`,
   output `dist`).
2. Env: `VITE_API_URL` = the Railway backend URL.
3. `client/vercel.json` SPA rewrite so React-Router deep links work:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
4. Confirm the client reads the API base from `VITE_API_URL` (not a hardcoded `localhost`).

---

## Phase 6 — Mobile / PWA

- Already responsive (Tailwind) and MapLibre works on mobile browsers → the public URL is usable on
  your phone immediately.
- Add **`vite-plugin-pwa`**: web manifest + service worker + icons → "Add to Home Screen", app-like
  launch, offline shell. No app-store / native build needed.
- Pass on iOS Safari + Android Chrome.

---

## Phase 7 — CI (quality gate for GitHub-as-master)

`.github/workflows/ci.yml`: on PR and push to `master`, run for both workspaces:
- `tsc -b` / `tsc` (typecheck + build), and `npm test` (server `tsx --test`).
- Vercel and Railway both auto-deploy on merge to `master`, so CI is the gate before anything ships.

Optionally: `.gitattributes` with `* text=auto eol=lf` to stop the Windows CRLF/LF churn seen in diffs.

---

## Phase 8 — Going-forward workflow (how we work from here)

1. GitHub `master` = single source of truth. Local machine is just a working copy.
2. Every change: I create a **branch → open a PR → CI runs → you review/merge**.
3. Merge to `master` → Vercel + Railway auto-deploy → live in ~1–2 min.
4. You can review and merge PRs from the **GitHub mobile app** or `github.com` on your phone.
5. Secrets live in Railway/Vercel/Supabase dashboards — never in git.

---

## Secrets & config inventory

| Secret | Where it lives | Notes |
|--------|---------------|-------|
| `DATABASE_URL`, `DIRECT_URL` | Railway (+ Supabase provides them) | pooled vs direct |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Railway | generate fresh strong values for prod |
| `CARTRACK_API_USERNAME/PASSWORD/BASE_URL` | Railway | telematics |
| `CARTRACK_ENCRYPTION_KEY` | Railway | **must match** the key used to encrypt stored creds |
| `BOLT_CLIENT_ID/SECRET/OIDC_TOKEN_URL/OAUTH_SCOPE` | Railway | OAuth2 |
| `UPLOAD_DIR` | Railway | mount path of the Railway Volume for uploads |
| `CLIENT_ORIGIN` | Railway | CORS allow-list = Vercel URL |
| `VITE_API_URL` | Vercel | Railway backend URL |

---

## Rough monthly cost (realistic, with 1.8 GB + commercial use)

| Service | Plan | Est. |
|---------|------|------|
| Vercel | Pro (commercial use isn't covered by Hobby) | ~$20/mo |
| Railway | Hobby: always-on backend + Postgres + Volume (usage-based) | ~$5–15/mo |
| **Total** | | **~$25–35/mo** |

> Railway-only (no Supabase) lands us near the low end: the 1.8 GB of history is billed as usage on
> Railway rather than forcing a flat $25 Supabase Pro tier. The biggest single line is Vercel Pro,
> required because commercial use isn't covered by Vercel's free Hobby plan.

---

## Decisions made (2026-07-11)

1. **Postgres host:** ✅ **Railway Postgres**, keep the full 1.8 GB history (no prune). Supabase dropped.
2. **Domain:** ✅ **Start on the free `*.vercel.app` / `*.railway.app` URLs** to get live fast; buy and
   point a custom domain (e.g. `fleet.jigsaw-ai.com`) once the app is stable — a 5-min DNS swap on Vercel,
   no code change.

## Still needed from you

- **Account creation:** **Vercel** and **Railway** accounts are created by you (I can't sign up on your
  behalf). Once they exist, I wire up configs, env-var lists, `vercel.json`, CI, the Volume mount, and all
  the code changes above. (No Supabase account needed anymore.)

---

## Suggested execution order

`PR #12 merge` → Phase 1 (schema) + Phase 2 (data) on a branch → Phase 3 (uploads) →
Phase 4 (Railway) + auth fixes → Phase 5 (Vercel) → Phase 6 (PWA) → Phase 7 (CI). Each phase is its
own PR so nothing lands on `master` unreviewed.
