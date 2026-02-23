/**
 * Reload Command - Reload commands (Admin only)
 */

module.exports = {
  name: 'reload',
  description: 'Reload commands (Admin only)',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const PermissionManager = require('../utils/PermissionManager');
    try {
      new PermissionManager().requirePermission(userId, 'admin');
    } catch (err) {
      await bot.sendMessage(chatId, '❌ Access denied. Administrators only.', { parse_mode: 'Markdown' });
      return;
    }

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Reloading commands...');

      // Clear require cache for command files
      const path = require('path');
      const fs = require('fs');
      const commandsPath = path.join(__dirname);
      
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
      
      commandFiles.forEach(file => {
        const filePath = path.join(commandsPath, file);
        delete require.cache[require.resolve(filePath)];
      });

      // Reload command handler
      // Note: This requires access to the CommandHandler instance
      // For now, we'll just confirm the cache clear
      const message = `✅ *Commands Reloaded*\n\n` +
        `*Status:* Commands cache cleared\n` +
        `*Files Reloaded:* ${commandFiles.length}\n\n` +
        `⚠️ Note: Full reload requires bot restart.\n` +
        `Use /setstatus to restart the bot.`;

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('Error reloading commands:', error);
      await bot.sendMessage(chatId, 
        `❌ *Error*\n\n` +
        `An error occurred while reloading commands:\n` +
        `\`${error.message}\``,
        { parse_mode: 'Markdown' }
      );
    }
  }
};
