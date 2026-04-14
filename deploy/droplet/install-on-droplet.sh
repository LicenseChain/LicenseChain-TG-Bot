#!/usr/bin/env bash
# Run on the Ubuntu droplet as root (after cloning this repo to /opt/LicenseChain-TG-Bot).
#   cd /opt/LicenseChain-TG-Bot && sudo bash deploy/droplet/install-on-droplet.sh
set -euo pipefail

APP_USER="licensechain"
APP_GROUP="licensechain"
APP_DIR="/opt/LicenseChain-TG-Bot"
NODE_MAJOR="${NODE_MAJOR:-20}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

if [[ ! -f "${APP_DIR}/package.json" ]]; then
  echo "Expected repo at ${APP_DIR} (package.json missing). Clone first:" >&2
  echo "  git clone https://github.com/LicenseChain/LicenseChain-TG-Bot.git ${APP_DIR}" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git ufw

if ! command -v node >/dev/null 2>&1 || ! node -e "process.exit(Number(process.version.slice(1).split('.')[0]) >= ${NODE_MAJOR} ? 0 : 1)" 2>/dev/null; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  # Home is the app directory (already cloned). Bash shell simplifies sudo -u for npm/git updates.
  useradd --system --home-dir "${APP_DIR}" --no-create-home --shell /bin/bash "${APP_USER}"
fi
chown -R "${APP_USER}:${APP_GROUP}" "${APP_DIR}"

mkdir -p "${APP_DIR}/logs"
chown "${APP_USER}:${APP_GROUP}" "${APP_DIR}/logs"

sudo -u "${APP_USER}" bash -c "cd '${APP_DIR}' && npm ci --omit=dev"

install -m 0644 "${APP_DIR}/deploy/droplet/licensechain-tg-bot.service" /etc/systemd/system/licensechain-tg-bot.service
systemctl daemon-reload
systemctl enable licensechain-tg-bot.service
systemctl restart licensechain-tg-bot.service

echo "Done. Check: systemctl status licensechain-tg-bot"
echo "Logs:    journalctl -u licensechain-tg-bot -f"
echo "Health:  curl -sS http://127.0.0.1:3005/health | jq ."
