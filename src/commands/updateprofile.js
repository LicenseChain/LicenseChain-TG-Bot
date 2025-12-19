/**
 * Update Profile Command
 */

module.exports = {
  name: 'updateprofile',
  description: 'Update your profile information',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    if (args.length < 2) {
      await bot.sendMessage(chatId, 
        '❌ *Usage:*\n\n' +
        'Update username: `/updateprofile username <new_username>`\n' +
        'Update name: `/updateprofile name <first_name> [last_name]`\n\n' +
        'Example: `/updateprofile username newusername`\n' +
        'Example: `/updateprofile name John`\n' +
        'Example: `/updateprofile name John Doe`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const field = args[0].toLowerCase();
    const value = args.slice(1).join(' ');

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Updating profile...');

      const updateData = {};
      
      if (field === 'username') {
        updateData.username = value;
      } else if (field === 'name') {
        const nameParts = value.split(' ');
        updateData.first_name = nameParts[0] || '';
        updateData.last_name = nameParts.slice(1).join(' ') || '';
      } else {
        await bot.editMessageText(
          '❌ *Invalid Field*\n\n' +
          'Field must be either "username" or "name".\n' +
          `You provided: ${field}`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
        return;
      }

      await dbManager.updateUser(userId, updateData);

      const message = `✅ *Profile Updated*\n\n` +
        `*Field Updated:* ${field}\n` +
        `*New Value:* ${value}\n\n` +
        `Use /profile to view your updated profile.`;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '👤 View Profile', callback_data: 'show_profile' }
            ]
          ]
        }
      };

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown',
        ...keyboard
      });

    } catch (error) {
      console.error('Error updating profile:', error);
      
      const errorMessage = `❌ *Update Failed*\n\n` +
        `An error occurred while updating your profile:\n` +
        `\`${error.message}\``;

      await bot.sendMessage(chatId, errorMessage, {
        parse_mode: 'Markdown'
      });
    }
  }
};
