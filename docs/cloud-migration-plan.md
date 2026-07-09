# Cloud Migration Plan — GitHub-as-master + Public URL + Mobile

**Goal:** Everything lives in GitHub (source of truth). The app is reachable on a public URL from
desktop and mobile. All future work flows through GitHub (branch → PR → CI → merge → auto-deploy).

**Chosen stack (Option A):**

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend (React/Vite SPA) | **Vercel** | Auto-deploys from GitHub, global CDN, instant HTTPS + custom domain |
| Backend (Express + Prisma + node-cron) | **Railway** | Always-on container → runs the Express app **and** the cron sync jobs unchanged |
| Database | **Supabase Postgres** (or Railway Postgres) | Managed Postgres, replaces the local SQLite file |
| File uploads | **Supabase Storage** | Durable object storage (container disks are ephemeral) |
| Mobile | **Responsive web + PWA** | Public URL works in any mobile browser; PWA adds "install to home screen" |

Data decision: **migrate the existing ~1.8 GB of local data** into hosted Postgres (not start fresh).

---

## Current-state summary (analysis)

- ✅ Already on GitHub: `github.com/dewet-debug/fleet-management`, `master` in sync.
- ✅ Outstanding Reports feature + repo hygiene committed in **PR #12** (merge this first).
- ✅ Schema is clean for Postgres: 37 models, **no `Json`/`Decimal`/`Bytes`** fields.
- ⚠️ DB is SQLite (a local file) — the core thing to replace.
- ⚠️ ~1.8 GB of data, almost all telematics history in the `Cartrack*` tables.
- ⚠️ Auth cookies are `sameSite: 'strict'` and CORS is `origin: true` — both must change for a
  cross-origin (Vercel ↔ Railway) deployment.
- ⚠️ Uploads write to a local `./uploads` dir (one 60 KB file today) — must move to object storage.

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

**⚠️ Storage/cost gate — decide before provisioning:**
- Supabase **Free** = 500 MB DB → **1.8 GB will not fit.**
- Supabase **Pro** ($25/mo) = 8 GB DB → fits comfortably.
- Alternative: **Railway Postgres** (usage-based storage, co-located with the backend → lower latency,
  one bill). Attractive if we keep the full history.
- Or **prune** high-volume telematics history (e.g. keep last N months of `CartrackVehicleData` /
  `CartrackTrip` / events) to fit a cheaper tier, since that data is re-syncable from Cartrack.

> **Open decision:** Supabase Pro vs Railway Postgres vs prune-then-Supabase-Free. See "Decisions needed".

---

## Phase 3 — Uploads → Supabase Storage

- Replace the multer-memory → local-disk flow with an upload to a Supabase Storage bucket; persist the
  returned public URL (instead of `/uploads/<file>`).
- Remove the `express.static('/uploads')` serving.
- Migrate the existing file(s) in `server/uploads/` into the bucket (trivial — one 60 KB file today).

---

## Phase 4 — Deploy backend to Railway

1. Railway project → **Deploy from GitHub repo**, root = `server/` (Nixpacks auto-detects Node; add a
   `Dockerfile` only if we want full control).
2. Build `npm run build`; start `node dist/index.js`; release command `prisma migrate deploy`.
3. Env vars (from `server/.env.example`): `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`,
   `JWT_REFRESH_SECRET`, `CARTRACK_*`, `BOLT_*`, `CARTRACK_ENCRYPTION_KEY`, `NODE_ENV=production`,
   plus Supabase Storage keys and `CLIENT_ORIGIN` (the Vercel URL).
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
| Supabase Storage service key | Railway | uploads |
| `CLIENT_ORIGIN` | Railway | CORS allow-list = Vercel URL |
| `VITE_API_URL` | Vercel | Railway backend URL |

---

## Rough monthly cost (realistic, with 1.8 GB + commercial use)

| Service | Plan | Est. |
|---------|------|------|
| Vercel | Pro (commercial use isn't covered by Hobby) | ~$20/mo |
| Railway | Hobby, always-on service | ~$5–10/mo |
| Supabase | Pro (needed for >500 MB) *or* Railway Postgres usage | ~$25/mo *(or usage-based)* |
| **Total** | | **~$30–55/mo** |

> This is higher than the earlier "$5–10" ballpark because keeping the full 1.8 GB of history and
> commercial-grade hosting both cost money. Pruning telematics history and/or using Railway Postgres
> can bring this down.

---

## Decisions needed before I start building

1. **Postgres host:** Supabase Pro ($25/mo, 8 GB) vs Railway Postgres (usage-based, co-located) vs
   prune history to fit Supabase Free.
2. **Custom domain?** (e.g. `fleet.yourdomain.com`) or use the free `*.vercel.app` / `*.railway.app`
   URLs to start.
3. **Account creation:** Vercel, Railway, and Supabase accounts are created by you (I can't sign up on
   your behalf). Once created, I can wire up configs, env-var lists, `vercel.json`, CI, and all the
   code changes above.

---

## Suggested execution order

`PR #12 merge` → Phase 1 (schema) + Phase 2 (data) on a branch → Phase 3 (uploads) →
Phase 4 (Railway) + auth fixes → Phase 5 (Vercel) → Phase 6 (PWA) → Phase 7 (CI). Each phase is its
own PR so nothing lands on `master` unreviewed.
