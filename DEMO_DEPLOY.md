# URS — Client Demo Deployment (no Oracle needed)

You already have a working demo stack. Use this — no new cloud account required.

| Piece | Where | URL |
|-------|-------|-----|
| Frontend | Cloudflare Pages (free) | `https://demotemp-b71.pages.dev` |
| Backend + DB | Railway | `https://demotemp-production.up.railway.app` |

**Cost:** Cloudflare Pages is free forever. Railway gives trial credit, then ~**$5/month**
for a small always-on API + MySQL — enough for a client demo that stays up 24/7.

---

## What the client opens

Send them: **https://demotemp-b71.pages.dev**

| Role | Email | Password |
|------|-------|----------|
| Platform Super Admin | `admin@urs.sa` | `password` |
| Demo company owner | `owner@demo.urs.sa` | `password` |

Data they enter is stored in Railway's MySQL and survives redeploys.

---

## How deploys work (already wired)

1. **Backend** — Railway watches `main` on GitHub (`iKennas/demotemp`). Push code →
   Railway rebuilds and runs migrations + seed automatically (`railway.toml`).
2. **Frontend** — GitHub Action (`.github/workflows/deploy-frontend.yml`) builds and
   pushes to Cloudflare Pages when `frontend/**` changes on `main`.

---

## One-time checks in the dashboards

### Railway (backend)
1. Open <https://railway.com> → your `demotemp` project.
2. Confirm the **backend service** is linked to repo `iKennas/demotemp`, branch `main`,
   root directory **`backend`**.
3. Confirm a **MySQL** plugin is attached and these env vars exist on the backend
   service (Railway usually injects `MYSQL*` / `DATABASE_URL` automatically):
   - `DB_CONNECTION=mysql`
   - `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
4. Set `APP_URL` to your public Railway URL, e.g.
   `https://demotemp-production.up.railway.app`
5. Generate `APP_KEY` once if missing: in Railway shell run
   `php artisan key:generate --show` and paste into env.

### Cloudflare Pages (frontend)
1. Open Cloudflare → **Workers & Pages** → project **demotemp**.
2. In **GitHub repo settings** (or Actions vars), ensure:
   ```
   VITE_API_URL = https://demotemp-production.up.railway.app/api
   ```
   (GitHub → repo **Settings → Secrets and variables → Actions → Variables**)
3. Secrets needed by the workflow: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

---

## Ship a code update

From your machine:

```bash
git add backend/app/Http/Controllers/Api/SubscriptionController.php
git add frontend/src/components/Layout.tsx
# ...other changed files...
git commit -m "Fix subscription API and navigation for demo."
git push origin main
```

- Railway redeploys the API automatically (watch the **Deployments** tab).
- If you changed anything under `frontend/`, the GitHub Action redeploys Pages too.
  Or trigger it manually: **Actions → Deploy Frontend to Cloudflare Pages → Run workflow**.

Verify after deploy:

```bash
curl https://demotemp-production.up.railway.app/up          # 200
curl -H "Authorization: Bearer <token>" \
  https://demotemp-production.up.railway.app/api/subscription  # no longer 500
```

---

## Reset demo data (optional)

In Railway → backend service → **Shell**:

```bash
php artisan migrate:fresh --seed --force
```

This wipes everything and restores the seeded logins above.

---

## If Railway trial runs out

Cheapest always-on alternatives (in order of ease):

1. **Keep Railway** (~$5/mo Hobby) — zero migration, already working.
2. **Hetzner VPS ~€4/mo** — use `docker-compose.yml` in this repo (see comments in
   `.env.demo.example`). Reliable, but not free.
3. **Render free tier** — backend sleeps after 15 min idle (bad for "open whenever"
   demos). Only use if the client will view it in a live session you schedule.

Oracle Cloud is optional and not required for this demo.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Login works but pages show wrong content briefly | Redeploy frontend (Layout fix uses `Outlet key={pathname}`). |
| Settings → billing shows errors | Redeploy backend (subscription null-company fix). |
| Frontend blank / API errors | Check `VITE_API_URL` ends with `/api` and Pages was rebuilt after changing it. |
| 502 from Railway | Check deploy logs; usually DB env vars missing or migrate failed. |
