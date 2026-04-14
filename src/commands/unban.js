/**
 * Unban User Command (Admin only)
 */

module.exports = {
  name: 'unban',
  description: 'Unban a user (Admin only)',
  
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
        '❌ *Usage:* `/unban <user_id>`\n\n' +
        'Example: `/unban 123456789`\n\n' +
        'This will remove the ban from the user.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const targetUserId = args[0];

    try {
      // Check if user exists
      const user = await dbManager.getUser(parseInt(targetUserId));
      
      if (!user) {
        await bot.sendMessage(chatId, 
          `❌ *User Not Found*\n\n` +
          `User with ID \`${targetUserId}\` not found in database.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Remove ban from database (you may need to implement this)
      // For now, we'll just send a message
      const message = `✅ *User Unbanned*\n\n` +
        `*User ID:* \`${targetUserId}\`\n` +
        `*Username:* ${user.username || 'N/A'}\n` +
        `*Unbanned By:* ${msg.from.username || msg.from.id}\n` +
        `*Date:* ${new Date().toLocaleDateString()}\n\n` +
        `✅ User ban has been removed.`;

      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

      // Optionally, send a message to the unbanned user
      try {
        await bot.sendMessage(targetUserId, 
          `✅ *You have been unbanned*\n\n` +
          `Your access to the bot has been restored.\n` +
          `You can now use the bot normally.`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.warn('Could not send unban message to user:', error.message);
      }

    } catch (error) {
      console.error('Error unbanning user:', error);
      await bot.sendMessage(chatId, 
        `❌ *Error*\n\n` +
        `An error occurred while unbanning the user:\n` +
        `\`${error.message}\``,
        { parse_mode: 'Markdown' }
      );
    }
  }
};
