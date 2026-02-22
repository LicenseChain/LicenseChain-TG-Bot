/**
 * License Command
 */

module.exports = {
  name: 'license',
  description: 'Manage your licenses',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      const licenseMessage = `📋 *License Management*\n\n` +
        `*Your Licenses:*\n` +
        `You currently have 0 licenses.\n\n` +
        `*Available Actions:*\n` +
        `• Validate a license: /validate <key>\n` +
        `• Send a license key directly to validate it\n` +
        `• Use the "Validate License" button\n\n` +
        `*Need Help?*\n` +
        `Type /help for more information.`;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔑 Validate License', callback_data: 'validate_license' }
            ],
            [
              { text: '❓ Help', callback_data: 'show_help' }
            ]
          ]
        }
      };

      await bot.sendMessage(chatId, licenseMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.error('Error in license command:', error);
      await bot.sendMessage(chatId, '❌ An error occurred while retrieving license information.');
    }
  }
};
