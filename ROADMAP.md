# Roadmap — LicenseChain Telegram Bot

High-level direction and planned improvements for the LicenseChain Telegram Bot.

## Current State (v1.0.x)

- **Modes:** Polling (default) and webhook (`USE_WEBHOOK` + `TELEGRAM_WEBHOOK_URL`); choose per deployment.
- **Stack:** Node.js 18+, Express (health/stats/webhook), PostgreSQL (e.g. Supabase), `node-telegram-bot-api`.
- **Features:** License commands (validate, create, extend, revoke, update), analytics, profile, admin panel (stats, users, licenses, products, webhooks, health, system, logs, settings), tickets, i18n, Validator and PermissionManager.
- **Deployment:** Docker, shared hosting (Node-capable), VPS/PaaS; docs for cPanel and shared hosting.

## Q2 2026

- Enhanced error handling and recovery mechanisms
- Improved admin panel functionality
- Better documentation and examples
- Performance optimizations
- CI/CD pipeline implementation

## Future

- Advanced analytics and reporting
- Enhanced webhook support
- Additional integration options
- Extended i18n coverage
- Plugin system for extensibility
- Advanced caching mechanisms
- Real-time monitoring dashboard
- Enterprise features

## Completed

- Polling and webhook support (env-based mode selection)
- Validator and PermissionManager; admin actions gated by permissions
- Admin panel: Products, Webhooks, Health; structured help and usage periods (7d, 30d, 90d, 1y)
- Startup: `TELEGRAM_TOKEN` required; `LICENSE_CHAIN_API_KEY` warning when missing
- PostgreSQL-only (Supabase); SQLite removed
- Documentation: README, shared hosting, cPanel setup, polling vs webhook
- Code cleanup: removed unused dependencies and files

## Discord Bot Alignment

All alignment items with the Discord bot have been completed:

- ✅ **Validator module** - Centralized validation for license keys, emails, user IDs, integers, periods
- ✅ **PermissionManager** - Owner and admin role management
- ✅ **Admin panel** - Products, Webhooks, Health buttons and handlers
- ✅ **Analytics** - Period options (7d, 30d, 90d, 1y) and per-license view
- ✅ **Structured help** - Command-specific help with usage, examples, permissions
- ✅ **Startup validation** - Required env checks and warnings

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute.
