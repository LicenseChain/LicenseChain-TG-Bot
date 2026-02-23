# LicenseChain Telegram Bot

[![License](https://img.shields.io/badge/license-Elastic--2.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Telegram](https://img.shields.io/badge/telegram-node--telegram--bot--api-blue.svg)](https://github.com/yagop/node-telegram-bot-api)

LicenseChain Telegram Bot for license operations, support flows, and admin controls over Telegram.

## Current Repository Stage

This repository currently runs as:

- A Telegram bot (`node-telegram-bot-api`) started from `src/index.js`, in either **polling** or **webhook** mode (see below).
- PostgreSQL-backed state (e.g. Supabase; `DATABASE_URL`).
- An HTTP health/stats server (Express) on `PORT` (default `3005`), with optional `POST /webhook` when in webhook mode.
- A modular command system loaded dynamically from `src/commands/*.js`.

## Requirements

- Node.js `>=18` (required by `package.json`)
- npm
- Telegram bot token from BotFather
- LicenseChain API key

## Installation

```bash
git clone https://github.com/LicenseChain/LicenseChain-TG-Bot.git
cd LicenseChain-TG-Bot
npm install
```

## Environment Variables

Create `.env` in project root:

```env
# Required
TELEGRAM_TOKEN=your_bot_token
LICENSE_CHAIN_API_KEY=your_licensechain_api_key

# Recommended
LICENSE_CHAIN_API_URL=https://api.licensechain.app
LICENSECHAIN_APP_NAME=your_app_id_or_name

# Bot/runtime
PORT=3005
LOG_LEVEL=info
LICENSECHAIN_APP_VERSION=1.0.0

# Admin controls (comma-separated IDs for admin list)
ADMIN_USERS=123456789,987654321
BOT_OWNER_ID=123456789

# Database (PostgreSQL, e.g. Supabase)
DATABASE_URL=postgresql://...

# Optional: Webhook mode (if set, polling is disabled)
# USE_WEBHOOK=true
# TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/webhook
# WEBHOOK_SECRET=optional_secret_token
```

Notes:

- `DATABASE_URL` must be a PostgreSQL connection string (e.g. Supabase). SQLite is not supported.
- `LICENSECHAIN_APP_NAME` is needed for app-scoped commands (create/list/analytics/status flows).
- For **webhook mode**: set `USE_WEBHOOK=true` and `TELEGRAM_WEBHOOK_URL` to the full URL Telegram will POST to (e.g. `https://tg.licensechain.app/api/webhook`). Optionally set `WEBHOOK_SECRET` and pass it to `setWebHook` so the bot verifies `X-Telegram-Bot-Api-Secret-Token`.

## Run

```bash
# Production
npm start

# Development
npm run dev
```

When running, the process starts:

- Telegram bot (polling or webhook, see below)
- `GET /health` (response includes `mode: "polling"` or `mode: "webhook"`)
- `GET /stats`
- `POST /webhook` (only when in webhook mode)

### Mode: Polling vs Webhook

- **Polling (default)**  
  If `USE_WEBHOOK` is not set or `TELEGRAM_WEBHOOK_URL` is missing, the bot uses long-polling: it runs 24/7 and fetches updates from Telegram. No public URL is required for receiving updates.

- **Webhook**  
  Set `USE_WEBHOOK=true` and `TELEGRAM_WEBHOOK_URL` to the full HTTPS URL where Telegram should POST updates (e.g. `https://tg.licensechain.app/api/webhook`). The app exposes `POST /webhook`; your reverse proxy must forward the chosen path to this route. Optionally set `WEBHOOK_SECRET` so the bot verifies the `X-Telegram-Bot-Api-Secret-Token` header. On startup the bot calls `setWebHook`; on shutdown it calls `deleteWebHook`.

Choose per deployment: same codebase, env vars decide the mode.

## Docker

This repository includes a `Dockerfile`.

```bash
docker build -t licensechain-telegram-bot .
docker run --name lc-tg-bot \
  -p 3005:3005 \
  -e TELEGRAM_TOKEN=your_bot_token \
  -e LICENSE_CHAIN_API_KEY=your_licensechain_api_key \
  -e LICENSECHAIN_APP_NAME=your_app_id_or_name \
  -e BOT_OWNER_ID=123456789 \
  -e ADMIN_USERS=123456789 \
  -e DATABASE_URL=postgresql://... \
  licensechain-telegram-bot
```

For webhook mode, add `-e USE_WEBHOOK=true` and `-e TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/webhook` (and optionally `-e WEBHOOK_SECRET=...`).

## Command Surface (Current)

Commands are loaded from `src/commands` and handled by `src/handlers/CommandHandler.js`.

Primary user commands:

- `/start`
- `/help`
- `/license`
- `/validate <license_key>`
- `/analytics`
- `/profile`
- `/settings`
- `/list`
- `/info <license_key>`

License/admin operations:

- `/create <issued_to_or_email> <plan> <expires>`
- `/update <license_id_or_key> ...`
- `/revoke <license_id_or_key>`
- `/extend <license_id_or_key> <days>`
- `/licenses`
- `/status`
- `/setstatus <online|offline|maintenance>`
- `/stats`
- `/reload`
- `/admin`
- `/logs [lines]`
- `/errors`
- `/performance`
- `/usage [timeframe]`
- `/user <id>`
- `/ban <id> [reason]`
- `/unban <id>`
- `/ticket ...`
- `/tickets`
- `/close <ticket_id>`
- `/m licenses`

Admin-gated commands are enforced with `ADMIN_USERS` and `BOT_OWNER_ID`.

## API Integration (Current)

The bot client (`src/client/LicenseChainClient.js`) targets API v1-style routes, including:

- `POST /v1/licenses/verify`
- `POST /v1/apps/:appId/licenses`
- `PATCH /v1/licenses/:id`
- `PATCH /v1/licenses/:id/status` (used by current update path)
- `DELETE /v1/licenses/:id` (used by current revoke path)
- `GET /v1/licenses/:id/analytics`
- `GET /v1/licenses/stats`
- `GET /v1/apps`
- `GET /v1/apps/:id`
- `GET /v1/apps/:id/licenses`
- `GET /health`

## Health Endpoints

- `GET /health` - process status, uptime, version
- `GET /stats` - bot identity + local usage counters

## Scripts

```bash
npm start
npm run dev
npm run lint
npm run lint:fix
npm test
```

## Hosting

You can run the TG-Bot on hosting **only if** the host supports **long-running Node.js applications** (the bot uses Telegram long-polling and must stay running 24/7). PHP-only or request-response-only hosting cannot run this bot as-is.

- Requirements (Node 18+, persistent process, PostgreSQL e.g. Supabase, env vars)
- Upload, `npm install`, `.env` setup
- Starting the bot (Node.js app, SSH + pm2, or host’s Node/Worker)
- Health check and keeping the bot running

If your host does not support a persistent Node process, use a VPS or PaaS (e.g. Railway, Render, Fly.io) and run `npm start` or the Docker image there.

## Troubleshooting

- Bot not responding:
  - verify `TELEGRAM_TOKEN`
  - ensure process is running and polling is not blocked
- License commands failing:
  - verify `LICENSE_CHAIN_API_KEY`
  - verify `LICENSECHAIN_APP_NAME`
  - verify API reachability from host
- No data persistence:
  - verify `DATABASE_URL` path and write permissions

## Roadmap and changelog

- [ROADMAP.md](ROADMAP.md) — planned work and current state.
- [CHANGELOG.md](CHANGELOG.md) — version history and release notes.
