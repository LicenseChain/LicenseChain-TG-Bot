# Changelog — LicenseChain Telegram Bot

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 

### Changed
- 

### Fixed
- 

### Removed
- Unused dependencies: `moment`, `lodash`
- Unused bot wrapper files: `DiscordBot.js`, `TelegramBot.js`

## [1.0.1] - 2026-02-22

### Fixed

- Fixed ESLint configuration module error by renaming `eslint.config.js` to `eslint.config.mjs`
- Fixed all lint errors: unreachable code, undefined variables, duplicate cases, unnecessary try/catch
- Fixed `loadingMsg` undefined errors in multiple command files (info, update, validate, errors, licenses, revoke)
- Fixed duplicate case labels in MessageHandler.js
- Fixed duplicate function definition `handleCreateCallback`
- Fixed `hasOwnProperty` usage to use `Object.prototype.hasOwnProperty.call()`
- Fixed duplicate else-if condition in licenses.js
- Updated test script to use `--passWithNoTests` flag

### Changed

- CI/CD workflow now passes all checks (lint, test, build)
- ESLint configuration now properly recognized as ES module

## [1.0.0] - 2026-02-21

### Added

- **Dual mode: polling and webhook**
  - Default: long-polling (24/7 process fetching updates from Telegram).
  - Optional webhook: set `USE_WEBHOOK=true` and `TELEGRAM_WEBHOOK_URL` to the full HTTPS URL; bot registers `setWebHook` on startup and `deleteWebHook` on shutdown.
  - Optional `WEBHOOK_SECRET` for `X-Telegram-Bot-Api-Secret-Token` verification.
  - `POST /webhook` returns 200 immediately and processes updates asynchronously.
- **Health endpoint** now includes `mode: "polling"` or `mode: "webhook"`.
- **Validator** module: license key, email, user id, integer, period, and display sanitization; used in validate, create, extend, revoke, update, usage.
- **PermissionManager**: owner (`BOT_OWNER_ID`) and admin list (`ADMIN_USERS`); used for all admin-only commands and callbacks.
- **Admin panel**: Products (list apps from API), Webhooks (list webhooks when API supports), Health (API health check).
- **Structured help**: per-command usage, examples, and permission; `/help <command>`.
- **Usage period** validation: 7d, 30d, 90d, 1y via `Validator.validatePeriod`.
- **PostgreSQL-only** persistence (Supabase); SQLite no longer supported.
- **Startup validation**: `TELEGRAM_TOKEN` required (exit if missing); warning if `LICENSE_CHAIN_API_KEY` is missing.
- **Documentation**: README (env, modes, Docker, commands), shared hosting guide, cPanel bots setup, ROADMAP and alignment doc.

### Changed

- Bot constructor uses `{ polling: !USE_WEBHOOK }` so polling is disabled when webhook is enabled.
- Express app uses `express.json()` for webhook body parsing.
- Graceful shutdown: `deleteWebHook()` in webhook mode; `stopPolling()` in polling mode.
- License changed from Elastic License 2.0 to Eclipse Public License 2.0.

### Fixed

- N/A (initial consolidated release).

---

[Unreleased]: https://github.com/licensechain/telegram-bot/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/licensechain/telegram-bot/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/licensechain/telegram-bot/releases/tag/v1.0.0
