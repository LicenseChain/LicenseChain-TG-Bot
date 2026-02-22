/**
 * M Command Handler
 * Handles /m licenses command
 */

module.exports = {
  name: 'm',
  description: 'M command handler for /m licenses',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const args = msg.text.split(' ').slice(1);

    // Check if it's /m licenses
    if (args.length > 0 && args[0].toLowerCase() === 'licenses') {
      // Delegate to list command
      const listCommand = require('./list');
      await listCommand.listUserLicenses(msg, bot, licenseClient, dbManager);
      return;
    }

    // Unknown /m command
    await bot.sendMessage(chatId, 
      '❌ *Usage:* `/m licenses`\n\n' +
      'Example: `/m licenses` to list your licenses.',
      { parse_mode: 'Markdown' }
    );
  }
};
