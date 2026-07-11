# Deploy checklist — Railway (backend + DB) + Vercel (frontend)

Everything in code is done (this branch). The steps below are the dashboard/config work
that can't be done from the repo. Do them in order.

## Prereqs (already done)
- ✅ Railway Postgres provisioned; `DATABASE_URL` / `DIRECT_URL` known.
- ✅ Schema applied (`prisma migrate deploy` → `0_init`, 35 tables).
- ✅ Data re-imported (A49, registry, workbook financials; Cartrack/Bolt syncs).

---

## Phase 3 — Uploads → Railway Volume
The app writes uploads to `UPLOAD_DIR` (defaults to `./uploads`) and serves them at `/uploads`.
No code change needed — just point it at a persistent disk:
1. Railway → backend service → **Volumes** → add a volume, mount path **`/data`**.
2. Set env var **`UPLOAD_DIR=/data/uploads`**.
3. (Optional) copy the existing `server/uploads/*.webp` onto the volume once.

## Phase 4 — Backend → Railway
1. Railway project → **New → Deploy from GitHub repo** → pick this repo.
2. Service settings:
   - **Root directory:** `server`
   - Build: the included **`server/Dockerfile`** is auto-detected (no build/start command needed).
     It runs `prisma migrate deploy` then `node dist/index.js` on boot.
3. **Variables** (Settings → Variables):
   | Var | Value |
   |-----|-------|
   | `DATABASE_URL` | Railway Postgres **internal** URL (`postgres.railway.internal`) — faster than the proxy |
   | `DIRECT_URL` | same internal URL (or the public proxy URL) |
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` / `JWT_REFRESH_SECRET` | fresh strong random values |
   | `CARTRACK_ENCRYPTION_KEY` | **must match** whatever encrypted the stored Cartrack password (currently `change-this-in-production-32chars` locally) |
   | `BOLT_CLIENT_ID` / `BOLT_CLIENT_SECRET` / `BOLT_OIDC_TOKEN_URL` / `BOLT_OAUTH_SCOPE` | from `server/.env` |
   | `UPLOAD_DIR` | `/data/uploads` (Phase 3) |
   | `CLIENT_ORIGIN` | the Vercel URL (set after Phase 5), e.g. `https://fleet.vercel.app` |
   | `PORT` | leave unset — Railway injects it |
4. Deploy. Grab the public backend URL (e.g. `https://fleet-api.up.railway.app`).
   - **Note:** the in-process `node-cron` Cartrack scheduler starts automatically once a Cartrack
     config row exists and is enabled — so once live, syncs run on Railway (fast, internal DB).

## Phase 5 — Frontend → Vercel
1. Vercel → **Add New → Project** → import this repo.
2. Settings:
   - **Root directory:** `client`
   - Framework preset: **Vite** (build `npm run build`, output `dist`).
   - `client/vercel.json` (SPA rewrite) is picked up automatically.
3. **Environment variable:** `VITE_API_URL` = the Railway backend URL **+ `/api/v1`**,
   e.g. `https://fleet-api.up.railway.app/api/v1`.
4. Deploy → grab the Vercel URL.
5. **Back to Railway:** set `CLIENT_ORIGIN` to that Vercel URL and redeploy the backend
   (so CORS allows it and auth cookies are accepted cross-origin).

## Post-deploy smoke test
- Open the Vercel URL → log in (`admin@fleet.com` / the prod password).
- Confirm Reports → Fleet Financials loads (proves DB + API + CORS all wired).
- Uploaded images (`/uploads/...`) are served by the backend. If you want them to load from the
  Vercel origin, add a rewrite to `client/vercel.json`:
  `{ "source": "/uploads/(.*)", "destination": "https://<railway-backend>/uploads/$1" }`
  (placed before the catch-all). Left out by default to avoid committing a hard-coded URL.

## Security follow-ups
- **Rotate the Railway Postgres password** (it was pasted in chat during setup).
- Generate fresh `JWT_SECRET` / `JWT_REFRESH_SECRET` for prod (don't reuse the dev defaults).
- The A49 sync (`server/src/services/a49.service.ts`) has a hard-coded API key + IP — move those
  to env vars before this is considered production-clean.
