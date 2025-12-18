/**
 * Info License Command
 */

module.exports = {
  name: 'info',
  description: 'Get license information',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    if (args.length === 0) {
      await bot.sendMessage(chatId, 
        '❌ *Usage:* `/info <license_key>`\n\n' +
        'Example: `/info LC-ABC123-DEF456-GHI789`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const licenseKey = args[0];

    try {
      // Show loading message
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Fetching license information...');

      // Validate license first to get basic info
      const validationResult = await licenseClient.validateLicense(licenseKey);
      
      if (!validationResult.valid) {
        await bot.editMessageText(
          `❌ *License Not Found*\n\n` +
          `Key: \`${licenseKey}\`\n` +
          `Reason: ${validationResult.reason || 'License key not found'}\n\n` +
          `Please check your license key and try again.`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
        return;
      }

      // Try to get detailed license info from API
      let licenseInfo = null;
      try {
        // Try to get license by key (if API supports it)
        licenseInfo = await licenseClient.getLicense(licenseKey).catch(() => null);
      } catch (error) {
        // If direct lookup fails, use validation result
        console.warn('Could not fetch detailed license info:', error.message);
      }

      // Build detailed message
      let message = `📋 *License Information*\n\n` +
        `*License Key:* \`${licenseKey}\`\n` +
        `*Status:* ${validationResult.status || 'Active'}\n`;

      if (licenseInfo) {
        if (licenseInfo.plan) message += `*Plan:* ${licenseInfo.plan}\n`;
        if (licenseInfo.issuedTo) message += `*Issued To:* ${licenseInfo.issuedTo}\n`;
        if (licenseInfo.issuedEmail) message += `*Email:* ${licenseInfo.issuedEmail}\n`;
        if (licenseInfo.createdAt) {
          message += `*Created:* ${new Date(licenseInfo.createdAt).toLocaleDateString()}\n`;
        }
      }

      if (validationResult.expiresAt) {
        const expiresDate = new Date(validationResult.expiresAt);
        const isExpired = expiresDate < new Date();
        message += `*Expires:* ${expiresDate.toLocaleDateString()} ${isExpired ? '❌' : '✅'}\n`;
      }

      if (validationResult.email) {
        message += `*Email:* ${validationResult.email}\n`;
      }

      message += `\n*Validation Status:* ✅ Valid`;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Validate Again', callback_data: `validate_license_${licenseKey}` },
              { text: '📊 Analytics', callback_data: `license_analytics_${licenseKey}` }
            ],
            [
              { text: '❓ Help', callback_data: 'show_help' }
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
      console.error('Error getting license info:', error);
      
      const errorMessage = `❌ *Error*\n\n` +
        `An error occurred while fetching license information:\n` +
        `\`${error.message}\`\n\n` +
        `Please try again later or contact support.`;

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
