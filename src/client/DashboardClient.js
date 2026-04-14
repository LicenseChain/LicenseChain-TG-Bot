/**
 * Client for LicenseChain Dashboard bot-only API (e.g. linked-user).
 * Used to show tier/role when a Telegram or Discord user has linked their account in the Dashboard.
 */

const axios = require('axios');

function getLinkedUser(telegramIdOrDiscordId, { platform = 'telegram' } = {}) {
  const baseUrl = (process.env.LICENSECHAIN_DASHBOARD_URL || process.env.DASHBOARD_URL || '').replace(/\/$/, '');
  const secret = process.env.BOT_LINKED_USER_SECRET;
  if (!baseUrl || !secret) return Promise.resolve(null);

  const param = platform === 'discord' ? 'discordId' : 'telegramId';
  const url = `${baseUrl}/api/bot/linked-user?${param}=${encodeURIComponent(String(telegramIdOrDiscordId))}`;

  return axios
    .get(url, {
      timeout: 5000,
      headers: { Authorization: `Bearer ${secret}` },
    })
    .then((res) => (res.data?.linked ? res.data : null))
    .catch(() => null);
}

module.exports = { getLinkedUser };
