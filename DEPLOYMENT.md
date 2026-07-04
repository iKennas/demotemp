# URS — Deployment Guide

Prepared ahead of actually provisioning hosting, so deployment is a checklist
rather than a research project once you're ready. See `PROJECT_MAP.md` for
overall project status.

**Architecture:** backend (Laravel API) on a VPS via Laravel Forge; frontend
(static Vite SPA) on Cloudflare Pages (or Vercel/Netlify — any static host
works, Pages is recommended since we already use Cloudflare R2 for storage).
They're deployed separately and talk over HTTPS — no shared server needed.

---

## 0. Legal & regulatory compliance (KSA) — read this before you provision anything

Researched 2026-07-04. This is a summary to act on, not legal advice — confirm
specifics with a Saudi lawyer/tax advisor before launch, especially the two
items marked **blocking**.

- [ ] **[BLOCKING] PDPL data residency conflicts with the R2 setup below.**
      Saudi's Personal Data Protection Law (full enforcement since September
      2024) makes in-Kingdom data residency the *default* requirement for
      personal data, not a best practice — fines reach **SAR 5 million per
      breach**. Cloudflare R2 does **not** default to KSA residency. Before
      storing real customer invoices/attachments/backups (§3.5, `R2_*`), you
      must either explicitly enable Cloudflare's Regional Services / Data
      Localization Suite pinned to the Saudi jurisdiction, or use a
      KSA-resident alternative (STC Cloud, Mobily, AWS's Saudi region).
      Also verify backups/logs don't silently replicate outside the
      jurisdiction — a commonly-missed gap even when the primary bucket is
      pinned correctly.
- [ ] **[BLOCKING-IF-APPLICABLE] ZATCA Phase 2 (e-invoicing integration)** is
      mandatory, not optional, once a customer's annual revenue crosses
      **SAR 750K** (Wave 23, already in effect) or **SAR 375K** (Wave 24,
      deadline June 30, 2026). This app only implements Phase 1 (simplified
      QR) — see `PROJECT_MAP.md` limitation #2. Decide your scope before
      onboarding any customer near or above these thresholds; don't find out
      after they're already relying on you.
- [ ] **VAT registration** — mandatory above SAR 375,000 annual taxable
      supplies for resident businesses. **If URS is a non-resident entity,
      there is no threshold at all** — registration is required regardless
      of revenue for non-resident digital service providers.
- [ ] **Payments (SAMA)** — no extra action needed. Moyasar is a
      SAMA-licensed Payment Services Provider, so merchants (you and your
      customers) just need a valid Saudi Commercial Registration and a
      linked Saudi bank account, not a separate SAMA license.
- [ ] **Company registration** — if URS isn't yet a registered Saudi entity:
      software/IT allows 100% foreign ownership under MISA. Path: MISA
      investor license (~SAR 12,000/yr + SAR 10,000 one-time) → Commercial
      Registration → Chamber of Commerce registration.
- [ ] **E-Commerce Law disclosures** — before checkout/signup completes,
      clearly display full pricing (incl. VAT), your CR number, contact
      details, and refund/cancellation terms. Any data breach must be
      reported to the Ministry of Commerce within 3 days.

---

## 1. Prerequisites checklist

- [ ] GitHub (or GitLab/Bitbucket) repo — push this local repo to it
- [ ] A VPS provider account (DigitalOcean, Hetzner, or Vultr — per earlier plan)
- [ ] Laravel Forge account, connected to that VPS provider
- [ ] A domain, with DNS you control (e.g. `yourdomain.com`)
- [ ] Cloudflare account (for R2 storage + optionally Pages for the frontend)
- [ ] Resend account (transactional email) — verify your sending domain
- [ ] Moyasar account (KSA payments) — only needed when you're ready to test
      real billing; the app works fine without it configured

---

## 2. Push to GitHub

```bash
cd "D:/download/abuwael/URS/accounting"
git remote add origin git@github.com:<you>/urs-accounting.git
git branch -M main
git push -u origin main
```

---

## 3. Backend — Laravel Forge

### 3.1 Create the server
In Forge: **Servers → Create Server**, pick your VPS provider, size (start
small — 1-2 vCPU/2GB is plenty for early traffic), region close to Saudi
Arabia (e.g. a European or UAE region if your provider offers one — lower
latency than US regions).

### 3.2 Create the site
**Sites → Create Site**
- Domain: `api.yourdomain.com`
- **Web Directory: `/backend/public`** — this is the one non-default setting;
  our repo is a monorepo with `backend/` and `frontend/` as siblings, not
  Laravel at the repo root.
- Project Type: General PHP / Laravel
- PHP version: 8.3

### 3.3 Connect the repo
**Site → Git Repository** → connect your GitHub repo, branch `main`.
Forge clones the whole monorepo; the web directory setting above points
nginx at `backend/public` specifically.

### 3.4 Database
**Server → Database** → create a new MySQL database + user (or use Forge's
prompt when creating the site). Note the credentials for the env step below.

### 3.5 Environment
**Site → Environment** → paste the contents of
[`backend/.env.production.example`](backend/.env.production.example) and
fill in every `<PLACEHOLDER>`:
- `APP_KEY` — leave blank, generate after first deploy (step 3.7)
- `DB_*` — from step 3.4
- `R2_*` — from your Cloudflare R2 bucket dashboard (Manage API Tokens).
  **See §0 first** — the default bucket setup is not KSA-resident by default.
- `RESEND_API_KEY` — from Resend
- `MOYASAR_*` — from Moyasar (can defer until you're ready for real billing)

### 3.6 Deploy script
**Site → Application → Deploy Script** → replace with the contents of
[`backend/scripts/forge-deploy.sh`](backend/scripts/forge-deploy.sh),
substituting `{{ SITE_DOMAIN }}` for your actual site path (Forge shows the
real path at the top of the deploy script editor, usually
`/home/forge/api.yourdomain.com`).

### 3.7 First deploy
Click **Deploy Now**. Once it finishes, SSH in (or use Forge's console) and run:
```bash
cd /home/forge/api.yourdomain.com/backend
php artisan key:generate --force
```
Then add the generated `APP_KEY` value into the Forge environment editor
and redeploy so it's picked up by `config:cache`.

### 3.8 SSL
**Site → SSL** → Let's Encrypt, one click. Do this before going live.

### 3.9 Scheduler (required — recurring invoices & low-stock alerts depend on it)
**Site → Scheduler** → enable. This runs `php artisan schedule:run` every
minute, which drives the two scheduled commands registered in
`routes/console.php` (`invoices:generate-recurring` at 01:00,
`inventory:send-low-stock-alerts` at 07:00).

### 3.10 Queue worker (required — invoice/payment posting, emails)
**Site → Queue** → add a worker for the `redis` connection (matches
`QUEUE_CONNECTION=redis` in the env template). Forge provisions Redis for
you if you enable it under **Server → Redis** first — do that before adding
the worker.

> Note: most of the app's write operations (invoice send, payments, journal
> posting) run synchronously today, not through the queue — the queue mainly
> matters for future work that dispatches jobs (e.g. queued emails). Setting
> it up now avoids a surprise later.

---

## 4. Frontend — Cloudflare Pages

1. **Pages → Create a project → Connect to Git** → same GitHub repo.
2. Build settings:
   - Framework preset: Vite
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Environment variables: add `VITE_API_URL` = `https://api.yourdomain.com/api`
   (see [`frontend/.env.production.example`](frontend/.env.production.example)).
4. Deploy. Pages gives you a `*.pages.dev` URL immediately; add your real
   domain (e.g. `app.yourdomain.com`) under **Custom Domains** once verified.

(Vercel/Netlify work identically if you prefer them — same three settings:
root directory `frontend`, build `npm run build`, output `dist`.)

---

## 5. Post-deploy verification

Run through this after every first deploy (and spot-check after major changes):

- [ ] `https://api.yourdomain.com/up` returns 200 (Laravel's built-in health check)
- [ ] Register a real test company through the frontend — confirms DB,
      migrations, and the full onboarding transaction work
- [ ] Create a customer, invoice, send it, download the PDF — confirms
      dompdf + R2 storage work in this environment
- [ ] **Check the ZATCA QR actually renders in the PDF here** — this was
      broken specifically under PHP's built-in dev server locally (see
      `PROJECT_MAP.md` limitation #1); php-fpm may not share that bug, but
      verify rather than assume
- [ ] Email an invoice — confirms Resend is wired correctly (check the
      Resend dashboard logs, not just a 200 response)
- [ ] `php artisan invoices:generate-recurring` and
      `php artisan inventory:send-low-stock-alerts` run without error via SSH
      (dry-run before waiting for the scheduler)
- [ ] If Moyasar is configured: run through `/subscription/checkout` and
      confirm the webhook activates the subscription (`WebhookController`)
- [ ] **Confirm the R2 bucket is actually pinned to the KSA jurisdiction**
      (see §0) before any real customer data is written to it — this is
      easy to skip since the app works identically either way locally

---

## 6. Rollback

Forge keeps previous deploys — **Site → Deployment History → Rollback** to
the last known-good commit if a deploy breaks something. For a bad
migration specifically, you'll need to write and run a down-migration or
restore from a DB backup (Forge supports scheduled MySQL backups — worth
enabling once real data exists, **Server → Backups**).
