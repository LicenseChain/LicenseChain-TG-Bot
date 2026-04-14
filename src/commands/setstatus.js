/**
 * Set Status Command - Set bot status (Admin only)
 */

module.exports = {
  name: 'setstatus',
  description: 'Set bot status (Admin only)',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    const PermissionManager = require('../utils/PermissionManager');
    try {
      new PermissionManager().requirePermission(userId, 'admin');
    } catch (err) {
      await bot.sendMessage(chatId, '❌ Access denied. Administrators only.', { parse_mode: 'Markdown' });
      return;
    }

    if (args.length === 0) {
      await bot.sendMessage(chatId, 
        '❌ *Usage:* `/setstatus <status>`\n\n' +
        'Example: `/setstatus online`\n' +
        'Example: `/setstatus maintenance`\n' +
        'Example: `/setstatus offline`\n\n' +
        '⚠️ *Warning:* Setting status to offline will stop the bot.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const status = args[0].toLowerCase();
    const validStatuses = ['online', 'offline', 'maintenance', 'restart'];

    if (!validStatuses.includes(status)) {
      await bot.sendMessage(chatId, 
        `❌ *Invalid Status*\n\n` +
        `Status must be one of: ${validStatuses.join(', ')}\n` +
        `You provided: ${status}`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    try {
      // Save status to database
      await dbManager.setBotStatus(status, userId);

      const message = `✅ *Bot Status Updated*\n\n` +
        `*New Status:* ${status.toUpperCase()}\n` +
        `*Set By:* ${msg.from.username || msg.from.id}\n` +
        `*Time:* ${new Date().toLocaleString()}\n\n`;

      if (status === 'restart') {
        await bot.sendMessage(chatId, 
          message + `⚠️ Bot restart requested. Please restart manually.`,
          { parse_mode: 'Markdown' }
        );
      } else if (status === 'offline') {
        await bot.sendMessage(chatId, 
          message + `⚠️ Bot status set to offline. Bot will stop responding to commands.`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await bot.sendMessage(chatId, 
          message + `✅ Bot status updated successfully.`,
          { parse_mode: 'Markdown' }
        );
      }

    } catch (error) {
      console.error('Error setting bot status:', error);
      await bot.sendMessage(chatId, 
        `❌ *Error*\n\n` +
        `An error occurred while setting bot status:\n` +
        `\`${error.message}\``,
        { parse_mode: 'Markdown' }
      );
    }
  }
};
