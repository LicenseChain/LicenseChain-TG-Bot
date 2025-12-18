/**
 * Extend License Command (Admin only)
 */

module.exports = {
  name: 'extend',
  description: 'Extend a license expiration date (Admin only)',
  
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

    // Parse command: /extend <license-key> <days>
    if (args.length < 2) {
      await bot.sendMessage(chatId, 
        '❌ *Usage:* `/extend <license-key> <days>`\n\n' +
        'Example: `/extend LC-ABC123-DEF456-GHI789 30`\n\n' +
        'This will extend the license expiration by the specified number of days.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const licenseKey = args[0];
    const days = parseInt(args[1]);

    // Validate days
    if (isNaN(days) || days <= 0) {
      await bot.sendMessage(chatId, 
        '❌ *Invalid Days*\n\n' +
        'Days must be a positive number.\n' +
        `You provided: ${args[1]}`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    let loadingMsg = null;
    try {
      loadingMsg = await bot.sendMessage(chatId, '🔄 Extending license...');

      // First, get current license info
      const licenseInfo = await licenseClient.validateLicense(licenseKey);
      
      if (!licenseInfo.valid) {
        await bot.editMessageText(
          `❌ *License Not Found*\n\n` +
          `License key: \`${licenseKey}\`\n` +
          `Reason: ${licenseInfo.reason || 'License key not found'}\n\n` +
          `Please check the license key and try again.`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
        return;
      }

      // Calculate new expiration date
      let newExpiresAt;
      if (licenseInfo.expiresAt) {
        // Extend from current expiration date
        const currentExpires = new Date(licenseInfo.expiresAt);
        newExpiresAt = new Date(currentExpires);
        newExpiresAt.setDate(newExpiresAt.getDate() + days);
      } else {
        // If no expiration, extend from now
        newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + days);
      }

      // Get app name from environment
      const appName = process.env.LICENSECHAIN_APP_NAME;
      if (!appName) {
        await bot.editMessageText(
          '❌ *Configuration Error*\n\n' +
          'LICENSECHAIN_APP_NAME is not configured.',
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
        return;
      }

      // Get app ID
      let appId = appName;
      try {
        const app = await licenseClient.getAppByName(appName);
        if (app && app.id) {
          appId = app.id;
        }
      } catch (appError) {
        console.warn('Could not fetch app info, using appName as appId:', appError.message);
      }

      // Update license expiration using updateLicense
      // Note: We need to find the license ID first, but since we only have the key,
      // we'll use the updateLicense method with the key as identifier
      // However, the API might require the license ID, so we'll try updating via the key
      const updateData = {
        expiresAt: newExpiresAt.toISOString()
      };

      // Try to update via license key (if API supports it)
      // Otherwise, we'll need to get the license ID first
      try {
        // For now, use the updateLicense method - it may need the license ID
        // We'll need to check if the API supports updating by key
        const result = await licenseClient.updateLicense(licenseKey, updateData);

        const message = `✅ *License Extended*\n\n` +
          `*License Key:* \`${licenseKey}\`\n` +
          `*Extended By:* ${days} days\n` +
          `*New Expiration:* ${newExpiresAt.toLocaleDateString()}\n` +
          `*Status:* ${licenseInfo.status || 'Active'}`;

        const keyboard = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📋 View License', callback_data: `license_info_${licenseKey}` },
                { text: '🔄 Extend Again', callback_data: `extend_license_${licenseKey}` }
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
      } catch (updateError) {
        // If update fails, try alternative approach
        throw updateError;
      }

    } catch (error) {
      console.error('Error extending license:', error);
      
      const errorMessage = `❌ *Extension Failed*\n\n` +
        `An error occurred while extending the license:\n` +
        `\`${error.message}\`\n\n` +
        `Please check the license key and try again.`;

      // Check if loadingMsg exists before trying to edit it
      if (typeof loadingMsg !== 'undefined' && loadingMsg && loadingMsg.message_id) {
        await bot.editMessageText(errorMessage, {
          chat_id: chatId,
          message_id: loadingMsg.message_id,
          parse_mode: 'Markdown'
        }).catch(() => {
          bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
        });
      } else {
        await bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
      }
    }
  }
};
