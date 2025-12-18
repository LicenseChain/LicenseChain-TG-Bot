/**
 * Profile Command
 */

module.exports = {
  name: 'profile',
  description: 'Manage your profile',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      const user = await dbManager.getUser(userId);
      
      if (user) {
        const profileMessage = `👤 *Your Profile*\n\n` +
          `*User ID:* ${user.telegram_id}\n` +
          `*Username:* ${user.username || 'Not set'}\n` +
          `*Name:* ${user.first_name || ''} ${user.last_name || ''}\n` +
          `*Member since:* ${new Date(user.created_at).toLocaleDateString()}\n\n` +
          `*Statistics:*\n` +
          `📋 Licenses: 0\n` +
          `✅ Validations: 0\n\n` +
          `Use /profile to update your information.`;

        await bot.sendMessage(chatId, profileMessage, {
          parse_mode: 'Markdown'
        });
      } else {
        // Create user if doesn't exist
        await dbManager.getOrCreateUser({
          id: userId,
          username: msg.from.username,
          first_name: msg.from.first_name,
          last_name: msg.from.last_name
        });
        
        await bot.sendMessage(chatId, '✅ Profile created! Use /profile again to see your information.');
      }
    } catch (error) {
      console.error('Error in profile command:', error);
      await bot.sendMessage(chatId, '❌ An error occurred while retrieving your profile.');
    }
  }
};
