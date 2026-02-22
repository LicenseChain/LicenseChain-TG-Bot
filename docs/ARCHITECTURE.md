# Architecture — LicenseChain Telegram Bot

## Ecosystem Overview

The LicenseChain Telegram Bot is **part of the LicenseChain ecosystem**, not a standalone tool. It depends on:

- **LicenseChain API** – for license validation, creation, listing, and app-scoped operations.
- **Shared Supabase (PostgreSQL)** – for bot state (`tg_bot_*` tables: users, tickets, commands, validations, settings, bot status).
- **Configuration** – same API base URL, API key, and (optionally) app name as used by the Dashboard/API.

It can be **deployed and run on its own** (e.g. separate process, server, or container), but it is not functionally independent: it is a **client** of the API and a **tenant** of the shared database.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     LicenseChain ecosystem                              │
├─────────────────────────────────────────────────────────────────────────┤
│  Dashboard (Next.js)     API (backend)      Website                     │
│  - Auth, apps, licenses  - /v1/licenses/*   - Marketing, blog, contact  │
│  - Uses: users,          - Source of truth  - Uses: contact_submissions,│
│    licenses, etc.          for licenses       blog_posts, etc.          │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                     Same PostgreSQL (Supabase)
                    - public.users, licenses, ...
                    - tg_bot_users, tg_bot_tickets, tg_bot_commands, ...
                                 │
┌────────────────────────────────┴───────────────────────────────────────┐
│  LicenseChain API (https://api.licensechain.app or self‑hosted)        │
│  - POST /v1/licenses/verify  - GET /v1/apps/:id/licenses  - etc.       │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌───────────────────┐
│ LicenseChain    │   │ LicenseChain    │   │ Other clients     │
│ Telegram Bot    │   │ Discord Bot     │   │ (SDKs, dashboards)│
│ - Telegram UI   │   │ - Discord UI    │   │                   │
│ - Same API key  │   │ - Same API key  │   │                   │
│ - tg_bot_* DB   │   │ - tg_bot_* DB   │   │                   │
└─────────────────┘   └─────────────────┘   └───────────────────┘
```

- **Dashboard / API / Website** – core products; they own "main" tables (`users`, `licenses`, etc.) and business logic.
- **TG-Bot (and Discord Bot)** – optional **channel clients**: they expose the same LicenseChain API and app over Telegram (and Discord), and store only **bot-specific state** in `tg_bot_*` tables.

## Workflow

### 1. License Operations (API)

All license actions go through the **LicenseChain API**, not the bot's DB:

- **Validate key** – User sends a key in Telegram → bot calls `POST /v1/licenses/verify` → API returns valid/invalid and details.
- **List licenses** – Bot calls API (e.g. app/licenses or filtered list); optional fallback to `tg_bot_licenses` cache if you use it.
- **Create / extend / revoke** – Admin commands in the bot call the corresponding API endpoints.

The bot uses:
- `LICENSE_CHAIN_API_KEY` – Bearer token for the API.
- `LICENSE_CHAIN_API_URL` – e.g. `https://api.licensechain.app`.
- `LICENSECHAIN_APP_NAME` – app identifier for app-scoped endpoints (create, list, analytics).

So: **license truth lives in the API (and main DB behind it)**; the bot is a **client** of that API.

### 2. Bot State (Supabase / Shared DB)

The bot does **not** store license truth in its own DB. It uses the **shared PostgreSQL (Supabase)** only for:

- **tg_bot_users** – Telegram users (and, in the same DB, Discord users in Discord bot).
- **tg_bot_tickets** – Support tickets opened from Telegram (and Discord).
- **tg_bot_commands**, **tg_bot_validations** – Command and validation logs.
- **tg_bot_user_settings** – Language, notifications, etc.
- **tg_bot_bot_status** – Online / offline / maintenance.
- **tg_bot_licenses** – Optional local cache; API remains the source of truth.

So: **same database as Dashboard/API/Website**, but **separate tables** (`tg_bot_*`) so the bot does not overwrite or replace core data.

### 3. End-to-End Flow Examples

- **User validates a key in Telegram**  
  → Bot gets Telegram user → ensures row in `tg_bot_users` (and optional settings) → calls API `POST /v1/licenses/verify` → logs in `tg_bot_validations` (and optionally `tg_bot_commands`) → replies in Telegram.

- **User opens a support ticket**  
  → Bot creates row in `tg_bot_tickets` (linked to `tg_bot_users.id`). No API call; ticket is bot-only state.

- **Admin creates a license from Telegram**  
  → Bot calls API (e.g. create license for app) → license is stored in the **API/main DB**; bot may optionally cache or list it via API.

- **Dashboard and bot**  
  → Same `licenses` table (via API) and same Supabase instance; different UIs (web vs Telegram). No direct Dashboard ↔ Bot link except shared API and DB.

## Authentication & User Management

### Sign-in and Tier Display

**Current state:**
- The bot has **no sign-in flow** with email/password or Dashboard credentials.
- It only knows **Telegram identities**: when a user writes in Telegram, the bot creates or finds a row in `tg_bot_users` (telegram_id, username, first_name, last_name).
- The `/profile` command shows only Telegram user info and app-level license counts, **not** Dashboard tier or role.

**Why separate tg_bot_* users?**

1. **Different identity systems**
   - **Dashboard:** Identity is email-based (NextAuth: email/password, OAuth). Stored in `users` (id, email, name, role, tier, …).
   - **Telegram:** Identity is Telegram's (telegram_id, username, first_name, last_name). No email or password in the chat.

2. **Not every Telegram user has a Dashboard account**
   - Many people may only use the bot to **validate a license key** or open a **support ticket**. They never sign up on the Dashboard.

3. **Optional linking is the right model**
   - The **Dashboard** supports "Link Telegram": a logged-in Dashboard user links their Telegram account. That link is stored in the **Dashboard** DB in `accounts` (provider = `'telegram'`, providerAccountId = telegram id, userId = Dashboard user id).
   - The bot can stay with **tg_bot_users** for everyone who talks to it (so it can log commands, tickets, validations, settings) and **optionally** treat a Telegram user as "linked" when that telegram_id exists in Dashboard's `accounts` table.

### Recommended Implementation

For **linked Dashboard users** (Sellers/Users who linked Telegram in the Dashboard):

- **Link** is already created in the Dashboard (Settings → Link Telegram → `accounts` with provider `telegram` and providerAccountId = telegram id).
- The bot should **use that link** to:
  - Resolve telegram_id → Dashboard user (via `accounts` + `users`).
  - In `/profile` (and similar): show **Dashboard** name, email (or masked), **tier**, **role** (e.g. "Pro", "Seller").

**Implementation direction:**

- Add a **Dashboard API** (or reuse existing) that the bot can call with **bot API key** (or service token), e.g.  
  `GET /api/bot/linked-user?telegramId=12345`  
  which:
  - Looks up `accounts` where provider = `'telegram'` and providerAccountId = telegramId.
  - If found, loads that user's `users` row (id, name, email, tier, role) and returns a safe subset (e.g. name, tier, role; no raw password).
- In the TG-Bot, in `/profile` (and any "account" command):
  - Call that API with `msg.from.id`.
  - If a linked user is returned: show "Linked to LicenseChain", tier, role, and optionally seller info.
  - If not linked: keep current behaviour (Telegram profile + app licenses + validation count only).

## Summary

| Question | Answer |
|----------|--------|
| Is the TG-Bot independent? | No. It depends on the LicenseChain API and shared Supabase. |
| Where do licenses live? | In the API and the main DB (e.g. `licenses`). The bot only calls the API. |
| What does the bot store? | Only bot state in `tg_bot_*` tables (users, tickets, commands, validations, settings, status). |
| Same DB as Dashboard? | Yes. Same Supabase project; different tables (`tg_bot_*` vs `users`, `licenses`, etc.). |
| Can it run in its own process/server? | Yes. It's a separate deployable app that uses the same API and DB. |
| Sign in to the bot with Dashboard credentials? | Not required. Use "Link Telegram" in the Dashboard; bot only resolves link. |
| See plan/tier on Telegram? | Yes, for **linked** users: bot calls Dashboard (or API) and shows tier/role in `/profile`. |

So: **LicenseChain-TG-Bot is an integrated client of the LicenseChain ecosystem**, providing a Telegram interface to the same API and sharing the same database for bot-specific state only.
