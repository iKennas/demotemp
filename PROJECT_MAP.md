# URS — Project Map & Status

> **Purpose of this file:** single source of truth for where the project stands.
> Read this first when starting a new chat session. Update the "Done" / "Next"
> sections as work progresses. Last updated: **2026-07-03**.

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
- Pages: Dashboard, Chart of Accounts, Journal Entries, Reports (3 tabs),
  Customers (+edit +statement), Suppliers (+edit +statement), Invoices
  (+send +PDF +email), Payments, Expenses, Revenues, Bank Accounts,
  Products (+edit +stock adjust), Team, Company Settings (+billing card),
  Platform Admin.

### Tests
- 7 feature tests, all passing (`php artisan test`):
  full invoice→payment→reports flow with balance assertions, journal-entry
  balance validation, tenant isolation, role-permission enforcement.

### Storage / integrations configured (env placeholders, not live)
- Cloudflare R2 (S3-compatible) disk `r2` for invoices/attachments/backups.
- Moyasar payment gateway keys.

---

## 4. KNOWN LIMITATIONS / DEFERRED ⚠️

1. **ZATCA QR image in the PDF** renders blank under `php artisan serve`
   (PHP built-in dev server) on this Windows box. The QR **data** is always
   stored correctly on the invoice (`zatca_qr_code`) — only the image embed in
   the PDF is affected, and only under this SAPI. Works under CLI/tinker.
   → **Re-verify once deployed behind php-fpm** (production target). See the
   long note in `backend/app/Services/InvoicePdfService.php`.
2. **Moyasar payments** are scaffolded to the documented API shape but never
   run against a live/sandbox account. Field names + webhook payload shape must
   be re-checked against Moyasar's dashboard when real keys are added.
3. **ZATCA Phase 2** (cryptographic stamping, XML invoice, clearance API) is out
   of scope — only Phase-1 simplified QR is implemented.
4. **VAT** is netted through a single `VAT Payable` account for both input and
   output tax (small-business simplification, not split input/output).

---

## 5. NEXT TASKS (in recommended order) 🔜

> Pick the top item unless the user directs otherwise. Update this list as items
> get done — move them up to section 3 and add new ones discovered along the way.

1. **Deployment** — VPS + Laravel Forge (the chosen host). Get it on a real
   domain behind php-fpm; this also lets us finally verify the ZATCA QR PDF
   render (limitation #1). Set up queue worker + scheduler cron.
2. **Wire real Moyasar sandbox keys** and verify the checkout + webhook loop
   end-to-end; fix any field-name mismatches (limitation #2).
3. **Expand test coverage** — recurring invoices, low-stock command, statements,
   PDF generation, expenses/revenues posting. Currently only 7 tests.
4. **Frontend polish** — edit/delete UI for remaining modules (journal entries
   detail, bank accounts, users edit/deactivate), loading/error states,
   pagination controls, empty-state illustrations.
5. **Dashboard depth** — charts (cash flow, revenue trend), recent activity,
   overdue-invoice widget, low-stock widget.
6. **Arabic / RTL** — the spec is Arabic; add i18n + RTL layout support.
7. **Invoice/report PDF polish** — company logo, better statement PDF export,
   downloadable report PDFs.
8. **Audit log** — track who changed what (useful for accounting compliance).

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
