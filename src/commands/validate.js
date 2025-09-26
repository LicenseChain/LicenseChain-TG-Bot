/**
 * Validate License Command
 */

module.exports = {
  name: 'validate',
  description: 'Validate a license key',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    if (args.length === 0) {
      await bot.sendMessage(chatId, 
        '❌ *Usage:* `/validate <license_key>`\n\n' +
        'Example: `/validate LC-ABC123-DEF456-GHI789`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const licenseKey = args[0];

    try {
      // Show loading message
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Validating license...');

      // Validate license
      const result = await licenseClient.validateLicense(licenseKey);

      let message;
      if (result.valid) {
        message = `✅ *License Valid*\n\n` +
          `Key: \`${licenseKey}\`\n` +
          `Status: Active\n` +
          `Message: ${result.message || 'License is valid and active'}\n`;

        if (result.expiresAt) {
          const expiresDate = new Date(result.expiresAt).toLocaleDateString();
          message += `Expires: ${expiresDate}\n`;
        }

        if (result.features && result.features.length > 0) {
          message += `Features: ${result.features.join(', ')}\n`;
        }

        if (result.usage) {
          message += `\n*Usage Statistics:*\n` +
            `Total Validations: ${result.usage.totalValidations || 0}\n` +
            `Last Validated: ${result.usage.lastValidated ? 
              new Date(result.usage.lastValidated).toLocaleDateString() : 'Never'}\n`;
        }

        // Add action buttons
        const keyboard = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📋 Get Details', callback_data: `license_info_${licenseKey}` },
                { text: '📊 Analytics', callback_data: `license_analytics_${licenseKey}` }
              ],
              [
                { text: '🔄 Validate Again', callback_data: 'validate_license' }
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

      } else {
        message = `❌ *License Invalid*\n\n` +
          `Key: \`${licenseKey}\`\n` +
          `Status: Invalid\n` +
          `Message: ${result.message || 'License key is invalid or expired'}\n\n` +
          `Please check your license key and try again.`;

        const keyboard = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔄 Try Another Key', callback_data: 'validate_license' },
                { text: '❓ Get Help', callback_data: 'show_help' }
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
      }

      // Log validation attempt
      await dbManager.logValidation(userId, licenseKey, result.valid);

    } catch (error) {
      console.error('Error validating license:', error);
      
      const errorMessage = `❌ *Validation Failed*\n\n` +
        `An error occurred while validating your license:\n` +
        `\`${error.message}\`\n\n` +
        `Please try again later or contact support if the problem persists.`;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Try Again', callback_data: 'validate_license' },
              { text: '❓ Get Help', callback_data: 'show_help' }
            ]
          ]
        }
      };

      try {
        await bot.editMessageText(errorMessage, {
          chat_id: chatId,
          message_id: loadingMsg.message_id,
          parse_mode: 'Markdown',
          ...keyboard
        });
      } catch (editError) {
        await bot.sendMessage(chatId, errorMessage, {
          parse_mode: 'Markdown',
          ...keyboard
        });
      }
    }
  }
};
