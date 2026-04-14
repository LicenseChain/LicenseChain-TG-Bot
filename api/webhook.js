/**
 * Vercel serverless handler for /api/webhook.
 * Requires USE_WEBHOOK=true and TELEGRAM_WEBHOOK_URL set. Uses bot and initializeBot from src/index.
 */
const { bot, initializeBot } = require('../src/index');

let initPromise = null;

function ensureInit() {
  if (!initPromise) {
    initPromise = initializeBot();
  }
  return initPromise;
}

function getChatIdFromUpdate(update) {
  const msg = update.message || update.edited_message || update.channel_post;
  if (msg?.chat?.id) return msg.chat.id;
  if (update.callback_query?.message?.chat?.id) return update.callback_query.message.chat.id;
  return null;
}

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const secretToken = process.env.WEBHOOK_SECRET;
  if (secretToken && req.headers['x-telegram-bot-api-secret-token'] !== secretToken) {
    res.status(403).end();
    return;
  }

  const update = req.body;
  if (!update || typeof update !== 'object') {
    res.status(400).end();
    return;
  }

  // Show "typing" immediately so users see feedback while init and command run (avoids 10min wait feeling)
  const chatId = getChatIdFromUpdate(update);
  if (chatId) {
    bot.sendChatAction(chatId, 'typing').catch(() => {});
  }

  try {
    await ensureInit();
    bot.processUpdate(update);
    res.status(200).end();
  } catch (err) {
    console.error('Webhook processUpdate error:', err);
    res.status(500).end();
  }
};
