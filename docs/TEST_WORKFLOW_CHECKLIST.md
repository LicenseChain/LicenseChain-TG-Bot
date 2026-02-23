# TG-Bot Test Workflow Checklist

Use this list to verify the bot works as intended. Test as **non-admin** first, then as **admin** (user ID in `ADMIN_USERS` or `BOT_OWNER_ID`).

---

## 1. Startup

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Start bot without `TELEGRAM_TOKEN` in env | Process exits with error: "TELEGRAM_TOKEN is required" |
| 1.2 | Start bot without `LICENSE_CHAIN_API_KEY` | Bot starts; console shows warning about API key |
| 1.3 | Start bot with valid `TELEGRAM_TOKEN` and `LICENSE_CHAIN_API_KEY` | Bot starts; "LicenseChain Telegram Bot is ready!" in logs |

---

## 2. General (any user)

| # | Command | Expected |
|---|---------|----------|
| 2.1 | `/start` | Welcome message + inline buttons (Validate, Analytics, Profile, Settings, Help) |
| 2.2 | `/help` | Full help (translations or default English) |
| 2.3 | `/help validate` | Command-specific help for validate (usage, example, description) |
| 2.4 | `/help admin` | Command-specific help for admin (Permission: admin) |
| 2.5 | `/help nonexistent` | "Command not found. Use /help to see all available commands." |
| 2.6 | `/profile` | Profile message; if Telegram linked in Dashboard, shows "LicenseChain Account (linked)" with tier/role |
| 2.7 | `/settings` | Settings keyboard (notifications, analytics, language, refresh) |
| 2.8 | `/license` or `/list` | License menu or list (depends on API/DB; may show empty or licenses) |
| 2.9 | `/analytics` | Analytics summary (users, licenses, validations, plans, recent activity) |
| 2.10 | `/usage` | Usage for default period (30d) |
| 2.11 | `/usage 7d` | Usage for last 7 days |
| 2.12 | `/usage 90d` | Usage for last 90 days |
| 2.13 | `/usage 1y` | Usage for last year |
| 2.14 | `/usage 2x` or invalid period | Error: invalid period / must be one of 7d, 30d, 90d, 1y, all |
| 2.15 | `/info` | Your user info (from DB) |

---

## 3. Validate (Validator + API)

| # | Command / Input | Expected |
|---|------------------|----------|
| 3.1 | `/validate` (no key) | Usage message for validate |
| 3.2 | `/validate x` or very short/invalid key | Error: "Invalid license key format" or "License key must be between 10 and 100 characters" |
| 3.3 | `/validate <valid_32char_key>` | Loading → valid: success + details; invalid: invalid message + buttons |
| 3.4 | Send a valid license key as plain text (no slash) | Bot validates it (MessageHandler license-key detection) |

---

## 4. Admin commands (admin/owner only)

Run these as a **non-admin** user first, then as **admin**.

### 4a. Non-admin

| # | Command | Expected |
|---|---------|----------|
| 4a.1 | `/admin` | "You are not authorized to use admin commands." |
| 4a.2 | `/create user FREE 30` | "Access denied. Administrators only." (or Insufficient permissions) |
| 4a.3 | `/extend KEY 30` | Access denied |
| 4a.4 | `/revoke KEY` | Access denied |
| 4a.5 | `/update KEY status ACTIVE` | Access denied |
| 4a.6 | `/status` | Access denied |
| 4a.7 | `/setstatus online` | Access denied |
| 4a.8 | `/close TKT-123-ABC` | Access denied |
| 4a.9 | `/ban 123` | Access denied |
| 4a.10 | `/unban 123` | Access denied |
| 4a.11 | `/logs` | Access denied |
| 4a.12 | `/reload` | Access denied |
| 4a.13 | `/stats` | Access denied |

### 4b. Admin: /admin panel and callbacks

As **admin** user:

| # | Action | Expected |
|---|--------|----------|
| 4b.1 | `/admin` | "Admin Panel" with inline keyboard |
| 4b.2 | Keyboard has buttons | Statistics, Users, Licenses, **Products**, **Webhooks**, **Health**, System, Logs (and optionally Settings) |
| 4b.3 | Click **Statistics** | Stats message (licenses, users, revenue, etc. from API or DB) |
| 4b.4 | Click **Users** | List of users (from API or DB) |
| 4b.5 | Click **Licenses** | List of licenses |
| 4b.6 | Click **Products** | List of apps from LicenseChain API, or "No products/apps found" if API fails |
| 4b.7 | Click **Webhooks** | List of webhooks from API, or "No webhooks found..." if endpoint not available |
| 4b.8 | Click **Health** | API health (status, response time, optional version/error) |
| 4b.9 | Click **System** | Node version, platform, uptime, memory, CPU |
| 4b.10 | Click **Logs** | Log file count, size, recent log files |
| 4b.11 | Click **Settings** | Message: configure via ADMIN_USERS, BOT_OWNER_ID |

### 4c. Admin: license lifecycle (create / extend / revoke / update)

| # | Command | Expected |
|---|---------|----------|
| 4c.1 | `/create` (no args) | Usage: `/create <user-id> <features> <expires>` |
| 4c.2 | `/create x y z` (invalid plan or expires) | Error: Invalid Plan or Invalid Date/Days |
| 4c.3 | `/create testuser@example.com PRO 30` | Email validated; license creation attempted (success/fail per API) |
| 4c.4 | `/create John Doe BUSINESS 2026-12-31` | License creation with issuedTo and date |
| 4c.5 | `/extend` (no args) | Usage |
| 4c.6 | `/extend badkey 30` | "Invalid license key format" (Validator) |
| 4c.7 | `/extend VALIDKEY -5` | "Value must be at least 1" (Validator) |
| 4c.8 | `/extend <key> 30` | Extend flow (success/fail per API) |
| 4c.9 | `/revoke` (no args) | Usage |
| 4c.10 | `/revoke badkey` | "Invalid license key format" |
| 4c.11 | `/revoke <key>` | Revoke flow (success/fail per API) |
| 4c.12 | `/update <key> status ACTIVE` | License update (Validator on key); success/fail per API |
| 4c.13 | `/update TKT-123-ABC closed` | Ticket status update (if ticket exists) |

### 4d. Admin: status, tickets, ban, logs, stats

| # | Command | Expected |
|---|---------|----------|
| 4d.1 | `/status` | Bot status (online/offline/maintenance) + stats |
| 4d.2 | `/setstatus maintenance` | Status updated in DB; bot may still respond (logic dependent) |
| 4d.3 | `/close <ticket-id>` | Ticket closed (if exists and you have permission) |
| 4d.4 | `/ban <telegram_user_id> reason` | User banned in DB |
| 4d.5 | `/unban <telegram_user_id>` | Ban removed |
| 4d.6 | `/logs` or `/logs 50` | Recent log lines (file-based) |
| 4d.7 | `/reload` | "Commands Reloaded" / cache cleared message |
| 4d.8 | `/stats` | Bot statistics (users, licenses, commands, etc.) |

---

## 5. Tickets (mixed: user + admin)

| # | Command / Action | As | Expected |
|---|-------------------|-----|----------|
| 5.1 | `/tickets` or ticket menu | Any | Ticket list or "New Ticket" / "List Tickets" buttons |
| 5.2 | Create ticket (button or flow) | User | Ticket created; can view own ticket |
| 5.3 | View own ticket | Owner | Ticket details |
| 5.4 | View another user's ticket | Non-admin | Denied (ownership check) |
| 5.5 | View any ticket | Admin | Allowed |
| 5.6 | Close ticket (callback or `/close`) | Admin | Ticket closed |

---

## 6. Callbacks (inline buttons)

| # | Flow | Expected |
|---|------|----------|
| 6.1 | /start → "Validate License" | Asks for license key or validates if key in context |
| 6.2 | /start → "Help" | Same as /help |
| 6.3 | /start → "Profile" | Same as /profile |
| 6.4 | /start → "Settings" | Same as /settings |
| 6.5 | /start → "Analytics" | Same as /analytics |
| 6.6 | After validate → "Get Details" / "Analytics" | License info or analytics for that key |
| 6.7 | Settings → toggle notifications/analytics | Setting updated; keyboard refreshed |
| 6.8 | Settings → "Change language" | Language list; choosing one updates preference |
| 6.9 | Admin panel → any of Statistics, Users, Licenses, Products, Webhooks, Health, System, Logs | Corresponding message (see 4b) |

---

## 7. PermissionManager consistency

Ensure **only** users in `ADMIN_USERS` or `BOT_OWNER_ID` can:

- Open `/admin` and use all admin panel buttons.
- Use `/create`, `/extend`, `/revoke`, `/update`, `/status`, `/setstatus`, `/close`, `/ban`, `/unban`, `/logs`, `/reload`, `/stats`.
- Close any ticket via callback or `/close`.

Any other user must get "Access denied" or "not authorized" on the above.

---

## 8. Validator coverage

| Input type | Where | Invalid example | Expected message (or similar) |
|------------|--------|------------------|-------------------------------|
| License key | validate, extend, revoke, update (license) | `x`, `<>script` | Invalid license key format / length |
| Email | create (user-id as email) | `notanemail` | Invalid email format |
| Integer (days) | extend | `-1`, `abc` | Value must be at least 1 / Invalid number |
| Period | usage | `2x`, `month` | Invalid period. Must be one of: 7d, 30d, 90d, 1y |

---

## Quick smoke sequence (minimal)

1. **Start:** Bot starts with token set; warning if API key missing.
2. **Non-admin:** `/start` → `/help` → `/help validate` → `/profile` → `/usage 7d`.
3. **Validate:** `/validate x` → error; `/validate <real_key>` → success or invalid from API.
4. **Admin denied:** As non-admin: `/admin` → "not authorized".
5. **Admin allowed:** As admin: `/admin` → panel with Products, Webhooks, Health → click **Health** → API status.
6. **Create/Validator:** As admin: `/create bad-email PRO 30` → email error; `/create user@example.com PRO 30` → create attempt.
7. **PermissionManager:** As admin: `/status` → status message; as non-admin: `/status` → access denied.

If all items in the quick smoke sequence pass, the core workflow (startup, Validator, PermissionManager, admin panel including Products/Webhooks/Health, help, usage period) is working as intended.

---

## Implementation alignment

The TG-Bot codebase is aligned with this checklist for the LicenseChain ecosystem:

- **Startup (§1):** `TELEGRAM_TOKEN` required (exit); `LICENSE_CHAIN_API_KEY` warning when missing.
- **General (§2):** `/start` shows welcome + inline buttons (Validate, Analytics, Profile, Settings, Help); `/help` and `/help <command>` with command-specific help and "Command not found. Use /help to see all available commands." for unknown commands; `/profile` (with optional linked-account tier/role); `/settings`, `/license`, `/list`, `/analytics`, `/usage [7d|30d|90d|1y|all]` with invalid-period error; `/info`.
- **Validate (§3):** Validator on key; usage when no key; invalid key format/length; plain-text license key handled by MessageHandler.
- **Admin (§4):** Non-admin gets "not authorized" or "Access denied. Administrators only." on admin-only commands; admin panel includes Statistics, Users, Licenses, Products, Webhooks, Health, System, Logs, **Settings** (configure via ADMIN_USERS, BOT_OWNER_ID); callbacks for each; create/extend/revoke/update with Validator and usage messages.
- **Tickets (§5):** `/tickets`, create, view own/admin, close (admin).
- **Callbacks (§6):** Start buttons, validate, profile, settings, analytics, help; admin panel callbacks; settings toggles and language.
- **PermissionManager (§7):** All admin actions gated by `ADMIN_USERS` / `BOT_OWNER_ID`.
- **Validator (§8):** License key, email, integer (min 1), period (7d, 30d, 90d, 1y; usage also supports `all`).

When changing behavior, update this checklist and the code together so they stay in sync.
