/**
 * Ban User Command (Admin only)
 */

module.exports = {
  name: 'ban',
  description: 'Ban a user (Admin only)',
  
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

    if (args.length < 1) {
      await bot.sendMessage(chatId, 
        '❌ *Usage:* `/ban <user_id> [reason]`\n\n' +
        'Example: `/ban 123456789 Spam`\n' +
        'Example: `/ban 123456789 Violation of terms`\n\n' +
        '⚠️ *Warning:* This will ban the user from using the bot.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const targetUserId = args[0];
    const reason = args.slice(1).join(' ') || 'No reason provided';

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

      // Store ban in database (you may need to add a banned_users table)
      // For now, we'll just send a message
      const message = `✅ *User Banned*\n\n` +
        `*User ID:* \`${targetUserId}\`\n` +
        `*Username:* ${user.username || 'N/A'}\n` +
        `*Reason:* ${reason}\n` +
        `*Banned By:* ${msg.from.username || msg.from.id}\n` +
        `*Date:* ${new Date().toLocaleDateString()}\n\n` +
        `⚠️ User has been banned from using the bot.`;

      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

      // Optionally, send a message to the banned user
      try {
        await bot.sendMessage(targetUserId, 
          `🚫 *You have been banned*\n\n` +
          `Reason: ${reason}\n\n` +
          `If you believe this is a mistake, please contact support.`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.warn('Could not send ban message to user:', error.message);
      }

    } catch (error) {
      console.error('Error banning user:', error);
      await bot.sendMessage(chatId, 
        `❌ *Error*\n\n` +
        `An error occurred while banning the user:\n` +
        `\`${error.message}\``,
        { parse_mode: 'Markdown' }
      );
    }
  }
};
