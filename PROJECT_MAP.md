# URS — Project Map & Status

> **Purpose of this file:** single source of truth for where the project stands.
> Read this first when starting a new chat session. Update the "Done" / "Next"
> sections as work progresses. Last updated: **2026-07-03** (audit log pass —
> all code-side spec work is now done; only user-provisioned deployment and
> live Moyasar keys remain).

URS is a **multi-tenant SaaS cloud accounting platform** for the Saudi market,
built from the spec in `الدراسة الفنية والتقنية.pdf` (Arabic technical study).

---

## 1. Quick Orientation

| Piece | Location | Stack |
|-------|----------|-------|
| Backend API | `backend/` | Laravel 13, PHP 8.3, MySQL/MariaDB |
| Frontend | `frontend/` | Vite + React 19 + TypeScript + Tailwind v4 |
| Original spec | `الدراسة الفنية والتقنية.pdf` | — |
| Composer (local) | `composer.phar` | run as `php composer.phar ...` |

### How to run (local dev)
```bash
# 1. Ensure MariaDB is running (see Environment Notes below)
# 2. Backend  (from backend/)
php artisan serve --port=8123
# 3. Frontend (from frontend/)
npm run dev            # serves on :5173, proxies API to :8123
```
Both are also wired into `.claude/launch.json` (names: `backend`, `frontend`)
for the preview tooling. Backend start uses `start-backend.cmd` at the root.

### Seeded demo logins (after `php artisan migrate:fresh --seed`)
- **Platform Super Admin:** `admin@urs.sa` / `password` (company_id = null)
- **Demo company owner:** `owner@demo.urs.sa` / `password`

---

## 2. Environment Notes (important — non-obvious setup)

This machine required manual setup that a fresh clone will also need:

- **Composer** is not globally installed — use the local `composer.phar`
  (`php composer.phar ...`).
- **php.ini** had to have these extensions enabled (they existed but were
  commented out): `openssl, mbstring, fileinfo, curl, zip, gd, intl,
  pdo_sqlite, sqlite3`. Path:
  `C:\Users\admin\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_*\php.ini`
- **Database:** MariaDB 12.2 at `C:\Program Files\MariaDB 12.2`. Other unrelated
  project DBs live on the same instance — **do not touch them**. URS uses an
  isolated DB `urs_accounting` with a dedicated user:
  - DB: `urs_accounting`, user: `urs_user`, pass: `UrsDev_2026!Secure`
  - (set in `backend/.env`; `root` with no password also works locally)
- **Start MariaDB** if down:
  `"C:/Program Files/MariaDB 12.2/bin/mysqld.exe" --defaults-file="C:/Program Files/MariaDB 12.2/data/my.ini"`
- **Tests** use in-memory SQLite (`phpunit.xml`), no MySQL needed:
  `php artisan test`

---

## 3. DONE ✅

### Backend — schema & foundation
- 25 tables migrated cleanly. Core: companies, users, plans, subscriptions,
  accounts (chart of accounts, self-referential), bank_accounts, customers,
  suppliers, products, inventory_movements, journal_entries + lines (double
  entry), invoices + items, payments, expenses, revenues, bank_transfers,
  + Spatie permission tables + Sanctum tokens.
- 17 Eloquent models with relationships.
- **Multi-tenancy:** `BelongsToCompany` trait (global scope + auto-fill
  `company_id`) on every tenant model. Spatie teams keyed by `company_id`.
  Platform Super Admin role uses sentinel `Company::PLATFORM_TEAM_ID = 0`
  (MySQL PKs can't be null).
- General Ledger is **computed** from `journal_entry_lines`, not a stored table
  (deliberate — avoids sync bugs).

### Backend — API (auth + all 8 spec modules)
- **Auth:** register (creates company + trial subscription + starter chart of
  accounts + roles + owner, all in one transaction), login, logout, me.
  Login uses `Hash::check` directly (not the ambiguous default guard).
- **Financial:** accounts CRUD, journal entries (draft→post→void with balance
  validation), reports — Trial Balance, General Ledger, P&L, Balance Sheet.
- **Customers / Suppliers:** CRUD + **statement of account** (كشف حساب).
- **Invoices:** CRUD + line items + auto totals, `send` (posts journal entry,
  applies inventory movements, generates ZATCA QR), void, **PDF download**,
  **email delivery**.
- **Cash flow:** payments, expenses, revenues, bank accounts, bank transfers —
  each auto-posts double-entry via shared `JournalPostingService`.
- **Inventory:** products CRUD + stock adjustment + low-stock filter.
- **Users/Team:** invite with company-scoped role, guarded (≥1 owner, no
  self-delete). Company settings. Subscription view.
- **Platform Admin (Super Admin only):** manage all companies + plans.
- **Permissions:** every route gated by `finance/customers/suppliers/invoices/
  cash/inventory/users/settings .view|.manage` per the spec's roles
  (Super Admin, Company Owner, Accountant, Employee).

### Backend — automation & billing scaffold
- **Recurring invoices** (الفواتير الدورية): `invoices:generate-recurring`
  command, scheduled daily 01:00. Generates + posts + QR-stamps next occurrence.
- **Low-stock alerts** (تنبيهات المخزون): `inventory:send-low-stock-alerts`
  command, scheduled daily 07:00. Emails company owners a digest.
- **Moyasar billing** (KSA gateway): `MoyasarService`, `SubscriptionController`
  (checkout), `WebhookController` (payment callback → activates subscription).
  Config in `config/services.php` + `.env`. **Not live-tested** (no credentials).

### Frontend
- Auth (login/register), token in localStorage, 401 auto-redirect.
- Permission-aware sidebar (hides what the user can't access).
- Pages: Dashboard, Chart of Accounts, Journal Entries, Reports (3 tabs +
  PDF export), Customers (+edit +delete +statement +statement PDF),
  Suppliers (+edit +delete +statement +statement PDF), Invoices (+send
  +PDF +email +void +delete +status filter), Payments (+delete), Expenses
  (+delete), Revenues (+delete), Bank Accounts (+edit +delete +balance
  view), Products (+edit +stock adjust), Journal Entries (+void +delete),
  Team/Users (+edit role/status +remove), Company Settings (+logo upload
  +billing card), Platform Admin.
- **Pagination, search, and empty states** on every list page via shared
  `Pagination` / `EmptyState` / `Spinner` components in `components/ui.tsx`.
- **Dashboard depth:** consolidated `/dashboard/summary` endpoint (permission-
  gated per section) backing a recharts `ComposedChart` (6-month revenue vs.
  expense trend) plus widget cards for overdue invoices, low stock, recent
  invoices, recent payments.
- **i18n / RTL:** `react-i18next` with English + Arabic locale files
  (`src/i18n/locales/{en,ar}.json`), language switcher in the sidebar footer,
  automatic `dir="rtl"` + mirrored layout when Arabic is active, persisted to
  localStorage. Layout, Login, Register, Dashboard fully translated.
- **Company logo:** upload UI in Settings (multipart upload, live preview via
  an authenticated `GET /company/logo` blob endpoint since the storage disk
  is private), shown on invoices/statements/reports PDFs.

### Tests
- **27 feature tests, all passing** (`php artisan test`, 200 assertions):
  full invoice→payment→reports flow with balance assertions, journal-entry
  balance validation, tenant isolation, role-permission enforcement,
  recurring invoices, low-stock alerts, statements, expenses/revenues
  posting, invoice PDF generation, dashboard summary, audit log
  create/update/delete diffs + tenant isolation + password redaction.

### Storage / integrations configured (env placeholders, not live)
- Cloudflare R2 (S3-compatible) disk `r2` for invoices/attachments/backups.
- Moyasar payment gateway keys.

### Deployment prep (2026-07-03)
- **Git repo initialized** at project root, initial commit made. Not pushed
  anywhere yet — no remote configured.
- **`DEPLOYMENT.md`** — full step-by-step guide: Laravel Forge for the backend
  (including the monorepo `Web Directory: /backend/public` gotcha), Cloudflare
  Pages for the frontend, scheduler + queue worker setup, post-deploy
  verification checklist, rollback notes.
- **`backend/.env.production.example`** and **`frontend/.env.production.example`**
  — filled-in production env templates (R2, Resend, Moyasar, queue=redis,
  cache=redis), ready to paste into Forge's env editor.
- **`backend/scripts/forge-deploy.sh`** — the exact deploy script to paste into
  Forge (composer install --no-dev, migrate --force, cache config/routes/views,
  queue:restart, fpm reload).
- Verified locally that `config:cache` / `route:cache` / `view:cache` all
  succeed and the app still serves correctly with them active (a common
  source of prod-only breakage) — cleared back to dev mode afterward.

### PDF polish (2026-07-03)
- **Company logo:** upload endpoint (`POST /company/logo`), authenticated
  preview endpoint (`GET /company/logo`), shown on invoices + statements +
  reports via a shared `PdfLogoResolver` service (downloads from whatever
  disk is configured — local or R2 — into a local temp file, since dompdf
  needs a filesystem path).
- **Report PDF exports:** trial balance, P&L, balance sheet — each a new
  `/reports/.../pdf` endpoint reusing the same data-computation methods as
  the JSON endpoints (`ReportController` refactored to extract
  `trialBalanceData()` / `profitAndLossData()` / `balanceSheetData()`).
- **Statement PDF exports:** `GET /customers/{id}/statement/pdf` and
  `GET /suppliers/{id}/statement/pdf`, same pattern.
- **Frontend:** "Download PDF" buttons on the Reports page and on the
  customer/supplier statement view; logo upload card on Settings with a live
  preview.
- **Fixed the long-standing "QR renders blank in PDF" bug** (previously
  documented as a suspected dev-server-only quirk, deferred to re-verify
  post-deployment). Actual root cause: `endroid/qr-code`'s `PngWriter`
  outputs a **palette/indexed-color PNG**, which dompdf silently fails to
  rasterize in this environment — confirmed by a side-by-side test embedding
  both a palette and a truecolor PNG in the same PDF (palette → blank,
  truecolor → renders). Fixed in `InvoicePdfService::render()` by converting
  the QR image to truecolor via GD before writing it to disk. Verified via
  PyMuPDF-rendered screenshots that both the logo and the QR code now show up
  correctly in generated PDFs. **This was not an environment-only issue —
  it would have shipped broken to production too.**

### Audit log (2026-07-03)
- **`audit_logs` table** + `AuditLog` model (company-scoped, nullable
  company_id as a safety net for edge cases with no company context).
- **`Auditable` trait** (`app/Models/Concerns/Auditable.php`) hooks
  create/update/delete on any model that uses it and writes a diff (before/
  after on update, full attribute snapshot on create/delete), automatically
  excluding hidden fields (e.g. `password`) via `getHidden()`. Applied to:
  Invoice, JournalEntry, Payment, Expense, Revenue, Customer, Supplier,
  Product, BankAccount, BankTransfer, Account, User, Company.
- New `audit.view` permission (Company Owner + Accountant by default) gates
  `GET /audit-logs` (paginated, filterable by action/model/user/date) and a
  matching frontend page + sidebar link, i18n'd in both locales.
- 4 new tests covering create/update diffs, delete logging, tenant
  isolation, and password redaction.

---

## 4. KNOWN LIMITATIONS / DEFERRED ⚠️

1. **Moyasar payments** are scaffolded to the documented API shape but never
   run against a live/sandbox account. Field names + webhook payload shape must
   be re-checked against Moyasar's dashboard when real keys are added.
2. **ZATCA Phase 2** (cryptographic stamping, XML invoice, clearance API) is out
   of scope — only Phase-1 simplified QR is implemented.
3. **VAT** is netted through a single `VAT Payable` account for both input and
   output tax (small-business simplification, not split input/output).

---

## 5. NEXT TASKS (in recommended order) 🔜

> Everything code-side from the original spec-derived punch list is now
> done. The two items left both require the user to provision external
> accounts/credentials — there is no more prep work to do without them.

1. **Actually deploy** — user needs to: create a GitHub repo and push (see
   `DEPLOYMENT.md` §1), get a VPS + Forge account, get a domain, get a
   Cloudflare account (R2 + Pages), get a Resend account. Then follow
   `DEPLOYMENT.md` end to end. Everything on the code/config side is ready.
2. **Wire real Moyasar sandbox keys** and verify the checkout + webhook loop
   end-to-end; fix any field-name mismatches (limitation #1). Best done after
   deployment (needs a real callback URL).

If picking this back up with no deployment credentials available yet, good
uses of time: expand automated test coverage further, add more granular
audit-log filtering/UI (e.g. a per-record "history" view), or revisit the
`frontend` bundle-size warning (currently one ~830KB chunk — candidate for
route-based code splitting via `React.lazy`).

---

## 6. Key Decisions to Remember

- **General Ledger = computed**, never stored. Reports read from posted
  `journal_entry_lines`. Raw-SQL report queries **must** re-apply the
  `company_id` filter manually (global scope doesn't reach joined tables) —
  this was a real bug fixed in `ReportController`.
- **Journal posting is centralized** in `JournalPostingService`. Never hand-build
  debits/credits in controllers.
- **Invoice totals** live in `InvoiceTotalsCalculator` (shared by controller +
  recurring command).
- **Tenant isolation** is enforced by `BelongsToCompany` global scope + the
  `tenant` middleware (`SetPermissionsTeamId`) that scopes Spatie per request.
- Bank accounts each auto-provision their own asset ledger account (codes 13xx).
- Starter chart of accounts codes are defined in `ChartOfAccountsSeeder` and
  relied on by name by `JournalPostingService`.
- **Images embedded in dompdf PDFs must be truecolor PNGs, not palette/
  indexed-color PNGs** — dompdf silently renders palette PNGs blank in this
  environment. Any new PDF feature that embeds a generated image (not a
  user-uploaded photo) should convert it via GD (`imagecreatetruecolor` +
  `imagecopy`) before writing it to the temp file, same as
  `InvoicePdfService::render()` does for the QR code.
