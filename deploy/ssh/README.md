# Droplet SSH key (ed25519)

- **Private key (never commit):** `droplet_licensechain_tg_bot_ed25519`
- **Public key (safe to share):** `droplet_licensechain_tg_bot_ed25519.pub`

Add the **`.pub`** contents under DigitalOcean → **Settings → Security → SSH keys**, then select that key when creating a droplet.

Connect:

```bash
ssh -i /path/to/repo/deploy/ssh/droplet_licensechain_tg_bot_ed25519 root@DROPLET_IP
```

To generate a **new** pair (e.g. per environment):

```bash
ssh-keygen -t ed25519 -f ./my-new-key -C "your-comment"
```

Then register **only** `my-new-key.pub` on DigitalOcean.
