/**
 * User Command - Get user information
 */

module.exports = {
  name: 'user',
  description: 'Get user information',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    // Check admin permissions for viewing other users
    const adminUsers = process.env.ADMIN_USERS ? process.env.ADMIN_USERS.split(',').map(id => id.trim()) : [];
    const botOwnerId = process.env.BOT_OWNER_ID;
    const isAdmin = adminUsers.includes(userId.toString()) || userId.toString() === botOwnerId;

    // If no user ID provided, show current user info
    const targetUserId = args.length > 0 ? args[0] : userId.toString();

    // Non-admins can only view their own info
    if (!isAdmin && targetUserId !== userId.toString()) {
      await bot.sendMessage(chatId, 
        '❌ *Access Denied*\n\n' +
        'You can only view your own user information.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Fetching user information...');

      // Get user from local database
      const localUser = await dbManager.getUser(parseInt(targetUserId));
      
      // Try to get user from API if admin
      let apiUser = null;
      if (isAdmin) {
        try {
          apiUser = await licenseClient.getUser(targetUserId).catch(() => null);
        } catch (error) {
          console.warn('Could not fetch user from API:', error.message);
        }
      }

      let message = `👤 *User Information*\n\n`;
      
      if (localUser) {
        message += `*Telegram ID:* ${localUser.telegram_id}\n`;
        message += `*Username:* ${localUser.username || 'Not set'}\n`;
        message += `*Name:* ${localUser.first_name || ''} ${localUser.last_name || ''}\n`;
        message += `*Member Since:* ${new Date(localUser.created_at).toLocaleDateString()}\n`;
      }

      if (apiUser) {
        if (apiUser.email) message += `*Email:* ${apiUser.email}\n`;
        if (apiUser.company) message += `*Company:* ${apiUser.company}\n`;
        if (apiUser.createdAt) {
          message += `*Account Created:* ${new Date(apiUser.createdAt).toLocaleDateString()}\n`;
        }
      }

      if (!localUser && !apiUser) {
        message += `User with ID \`${targetUserId}\` not found.`;
      }

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('Error getting user info:', error);
      
      const errorMessage = `❌ *Error*\n\n` +
        `An error occurred while fetching user information:\n` +
        `\`${error.message}\``;

      await bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
    }
  }
};
