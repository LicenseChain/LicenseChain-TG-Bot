# DigitalOcean Droplet — LicenseChain Telegram Bot

This guide deploys the bot on an **Ubuntu** droplet with **systemd**, **Node.js 20**, and **SSH key** login. Default runtime is **polling** (no inbound Telegram webhook port required).

## Prerequisites

- A [DigitalOcean](https://www.digitalocean.com/) account.
- Bot token from [@BotFather](https://t.me/BotFather).
- `DATABASE_URL` (e.g. Supabase Postgres), `LICENSECHAIN_API_KEY`, and other values from `.env.example`.

---

## Part A — SSH key (on your laptop or workstation)

A dedicated **ed25519** key pair for this droplet lives in the repo (private key is **gitignored**):

| File | Purpose |
|------|---------|
| `deploy/ssh/droplet_licensechain_tg_bot_ed25519` | **Private key** — keep secret; use with `ssh -i ...` |
| `deploy/ssh/droplet_licensechain_tg_bot_ed25519.pub` | **Public key** — add to DigitalOcean and to the droplet’s `authorized_keys` |

**Public key (also in `deploy/ssh/droplet_licensechain_tg_bot_ed25519.pub`):**

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIkxPR4HH20rK+NXwNY9BLcvbmIK5OvP7lbVZv6z32MF licensechain-tg-bot-droplet@digitalocean
```

### A1. Add the public key to DigitalOcean

1. Log in to DigitalOcean.
2. Go to **Account** (avatar) → **Settings** → **Security** → **SSH keys**.
3. Click **Add SSH Key**.
4. Paste the **entire line** above (starts with `ssh-ed25519`).
5. Name it e.g. `licensechain-tg-bot-droplet`.
6. Save.

### A2. Connect later from your machine

```bash
ssh -i /path/to/LicenseChain-TG-Bot/deploy/ssh/droplet_licensechain_tg_bot_ed25519 root@YOUR_DROPLET_IP
```

If you regenerate keys, update DigitalOcean and this doc accordingly.

---

## Part B — Create the droplet (DigitalOcean UI)

1. In the control panel, click **Create** → **Droplets**.
2. **Choose Region:** pick the region closest to your users or your database (e.g. same region as Supabase if applicable).
3. **Choose an image:** **Ubuntu 24.04 (LTS) x64**.
4. **Choose Size:** for polling + Postgres over the network, **Basic — Regular Intel/AMD**, **1 GB / 1 vCPU** is a sensible minimum; use **2 GB** if you want headroom.
5. **Authentication:** select **SSH keys** and tick **`licensechain-tg-bot-droplet`** (the key you added in A1).
   - Do **not** enable password authentication for production.
6. **Hostname:** e.g. `licensechain-tg-bot`.
7. Click **Create Droplet** and wait until the IP address is shown.

---

## Part C — First boot: firewall and optional updates

SSH in (replace `IP`):

```bash
ssh -i deploy/ssh/droplet_licensechain_tg_bot_ed25519 root@IP
```

On the droplet:

```bash
apt-get update && apt-get upgrade -y
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw enable
# Optional: allow health only from your IP (default bot binds 0.0.0.0:3005 — see hardening below)
# ufw allow from YOUR_MONITORING_IP to any port 3005 proto tcp
```

**Hardening (recommended):** the bot listens on `PORT` (default **3005**) for `/health`. Either leave it bound to localhost only (code change + `LISTEN`) or keep it private and use `ufw` so **3005 is not open to the world**. For polling-only operation you do **not** need to open 443/80 unless you use **webhook** mode.

---

## Part D — Install the bot

### D1. Clone the repository

```bash
apt-get install -y git
git clone https://github.com/LicenseChain/LicenseChain-TG-Bot.git /opt/LicenseChain-TG-Bot
cd /opt/LicenseChain-TG-Bot
git checkout main
```

### D2. Create `.env`

```bash
cp .env.example .env
nano .env   # or vim
chmod 600 .env
```

Set at minimum:

- `TELEGRAM_TOKEN`
- `DATABASE_URL`
- `LICENSECHAIN_API_KEY`
- `LICENSECHAIN_BASE_URL` (default `https://api.licensechain.app/v1` is fine)

For **polling** (simplest on a droplet), leave:

- `USE_WEBHOOK` unset or `false`

### D3. Run the installer (Node + systemd)

```bash
bash deploy/droplet/install-on-droplet.sh
```

This installs Node.js **20**, runs `npm ci --omit=dev`, installs and starts **`licensechain-tg-bot.service`**.

### D4. Verify

```bash
systemctl status licensechain-tg-bot
journalctl -u licensechain-tg-bot -n 50 --no-pager
curl -sS http://127.0.0.1:3005/health
```

You should see JSON with `"status":"healthy"` and `"mode":"polling"`.

---

## Part E — Updates after code changes

```bash
cd /opt/LicenseChain-TG-Bot
git pull origin main
sudo bash deploy/droplet/install-on-droplet.sh
```

Or manually:

```bash
sudo -u licensechain bash -c 'cd /opt/LicenseChain-TG-Bot && npm ci --omit=dev'
sudo systemctl restart licensechain-tg-bot
```

---

## Webhook mode (optional)

If you later use `USE_WEBHOOK=true` and `TELEGRAM_WEBHOOK_URL`:

1. Point a DNS name to the droplet (e.g. `tg.example.com`).
2. Install **Caddy** or **nginx** with a valid TLS certificate and reverse-proxy `https://tg.example.com/webhook` → `http://127.0.0.1:3005/webhook` (path must match `src/index.js`: **`POST /webhook`**).
3. Set `WEBHOOK_SECRET` and configure Telegram `secret_token` (see `.env.example`).
4. Open **443** in UFW only as needed.

---

## Troubleshooting

| Symptom | Check |
|--------|--------|
| `systemctl` failed | `journalctl -u licensechain-tg-bot -e` |
| DB errors | `DATABASE_URL` SSL params (`sslmode=require`) and IP allowlist on Supabase |
| `TELEGRAM_TOKEN` missing | `.env` path and `EnvironmentFile` in unit file |
| Permission errors on `logs/` | `chown -R licensechain:licensechain /opt/LicenseChain-TG-Bot/logs` |

---

## Security reminders

- Never commit `.env` or the **private** SSH key.
- Rotate `TELEGRAM_TOKEN` in BotFather if a key leaks.
- Prefer **SSH keys only**; disable password SSH in `/etc/ssh/sshd_config` if not already (`PasswordAuthentication no`).
