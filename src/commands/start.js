/**
 * Start Command
 */

module.exports = {
  name: 'start',
  description: 'Start the bot and get help',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;

    try {
      // Register user if not exists
      await dbManager.getOrCreateUser({
        id: userId,
        username: username,
        first_name: msg.from.first_name,
        last_name: msg.from.last_name
      });

      const welcomeMessage = `🎉 *Welcome to LicenseChain Bot!*\n\n` +
        `Hello ${msg.from.first_name}! I'm here to help you manage your licenses.\n\n` +
        `*What I can do:*\n` +
        `🔑 Validate license keys\n` +
        `📊 View analytics and statistics\n` +
        `👤 Manage your profile\n` +
        `⚙️ Configure settings\n` +
        `📋 List your licenses\n\n` +
        `*Available Commands:*\n` +
        `/help - Show all commands\n` +
        `/license - Manage licenses\n` +
        `/validate <key> - Validate a license\n` +
        `/analytics - View statistics\n` +
        `/profile - Manage profile\n` +
        `/settings - Bot settings\n\n` +
        `Type /help for more information!`;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔑 Validate License', callback_data: 'validate_license' },
              { text: '📊 Analytics', callback_data: 'show_analytics' }
            ],
            [
              { text: '👤 Profile', callback_data: 'show_profile' },
              { text: '⚙️ Settings', callback_data: 'show_settings' }
            ],
            [
              { text: '❓ Help', callback_data: 'show_help' }
            ]
          ]
        }
      };

      await bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });

    } catch (error) {
      console.error('Error in start command:', error);
      await bot.sendMessage(chatId, '❌ An error occurred. Please try again later.');
    }
  }
};
