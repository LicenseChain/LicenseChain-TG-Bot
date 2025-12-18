/**
 * Update License Command (Admin only)
 */

module.exports = {
  name: 'update',
  description: 'Update a license (Admin only)',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    // Check admin permissions
    const adminUsers = process.env.ADMIN_USERS ? process.env.ADMIN_USERS.split(',').map(id => id.trim()) : [];
    const botOwnerId = process.env.BOT_OWNER_ID;
    
    if (!adminUsers.includes(userId.toString()) && userId.toString() !== botOwnerId) {
      await bot.sendMessage(chatId, 
        '❌ *Access Denied*\n\n' +
        'This command is restricted to administrators only.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Parse command: /update <license-key> <field> <value>
    if (args.length < 3) {
      await bot.sendMessage(chatId, 
        '❌ *Usage:* `/update <license_key> <field> <value>`\n\n' +
        'Example: `/update LC-ABC123-DEF456-GHI789 status ACTIVE`\n' +
        'Example: `/update LC-ABC123-DEF456-GHI789 plan PRO`\n' +
        'Example: `/update LC-ABC123-DEF456-GHI789 expiresAt 2025-12-31`\n\n' +
        'Fields: status, plan, expiresAt, issuedTo, issuedEmail',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const licenseKey = args[0];
    const field = args[1].toLowerCase();
    const value = args.slice(2).join(' ');

    // Validate field
    const validFields = ['status', 'plan', 'expiresat', 'issuedto', 'issuedemail'];
    if (!validFields.includes(field)) {
      await bot.sendMessage(chatId, 
        `❌ *Invalid Field*\n\n` +
        `Field must be one of: status, plan, expiresAt, issuedTo, issuedEmail\n` +
        `You provided: ${field}`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Updating license...');

      // First, get the license to find its ID
      const validationResult = await licenseClient.validateLicense(licenseKey);
      
      if (!validationResult.valid) {
        await bot.editMessageText(
          `❌ *License Not Found*\n\n` +
          `License key \`${licenseKey}\` was not found.\n` +
          `Reason: ${validationResult.reason || 'License key not found'}`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
        return;
      }

      // Prepare update data
      const updateData = {};
      
      // Map field names
      if (field === 'status') {
        updateData.status = value.toUpperCase();
      } else if (field === 'plan') {
        updateData.plan = value.toUpperCase();
      } else if (field === 'expiresat') {
        // Try to parse date
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date format. Use YYYY-MM-DD or ISO format.');
        }
        updateData.expiresAt = date.toISOString();
      } else if (field === 'issuedto') {
        updateData.issuedTo = value;
      } else if (field === 'issuedemail') {
        // Basic email validation
        if (!value.includes('@')) {
          throw new Error('Invalid email format.');
        }
        updateData.issuedEmail = value;
      }

      // Try to get license ID (may need to use licenseKey as ID)
      const licenseId = licenseKey; // API might use licenseKey as identifier

      // Update license via API
      const result = await licenseClient.updateLicense(licenseId, updateData);

      let message = `✅ *License Updated*\n\n` +
        `*License Key:* \`${licenseKey}\`\n` +
        `*Field Updated:* ${field}\n` +
        `*New Value:* ${value}\n`;

      if (result.status) {
        message += `*Status:* ${result.status}\n`;
      }
      if (result.plan) {
        message += `*Plan:* ${result.plan}\n`;
      }

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📋 View License', callback_data: `license_info_${licenseKey}` },
              { text: '🔄 Update Again', callback_data: 'update_license' }
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
      console.error('Error updating license:', error);
      
      const errorMessage = `❌ *Update Failed*\n\n` +
        `An error occurred while updating the license:\n` +
        `\`${error.message}\`\n\n` +
        `Please check the field and value and try again.`;

      await bot.editMessageText(errorMessage, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      }).catch(() => {
        bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
      });
    }
  }
};
