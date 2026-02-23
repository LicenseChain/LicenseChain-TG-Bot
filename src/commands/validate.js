/**
 * Validate License Command
 */

const Validator = require('../utils/Validator');

module.exports = {
  name: 'validate',
  description: 'Validate a license key',

  async execute(msg, bot, licenseClient, dbManager, translator) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);
    const lang = await translator.getUserLanguage(userId);

    if (args.length === 0) {
      await bot.sendMessage(chatId,
        translator.t('validate.usage', lang),
        { parse_mode: 'Markdown' }
      );
      return;
    }

    let licenseKey;
    try {
      licenseKey = Validator.validateLicenseKey(args[0]);
    } catch (err) {
      await bot.sendMessage(chatId, Validator.sanitizeForDisplay(err.message), { parse_mode: 'HTML' });
      return;
    }

    // Show loading message (defined outside try to be accessible in catch)
    let loadingMsg;
    try {
      loadingMsg = await bot.sendMessage(chatId, translator.t('validate.validating', lang));

      // Validate license
      const result = await licenseClient.validateLicense(licenseKey);

      let message;
      if (result.valid) {
        message = translator.t('validate.valid', lang, {
          key: licenseKey,
          message: result.message || 'License is valid and active'
        });

        if (result.expiresAt) {
          const expiresDate = new Date(result.expiresAt).toLocaleDateString();
          message += '\n' + translator.t('validate.expires', lang, { date: expiresDate });
        }

        if (result.features && result.features.length > 0) {
          message += '\n' + translator.t('validate.features', lang, { features: result.features.join(', ') });
        }

        if (result.usage) {
          message += '\n\n' + translator.t('validate.usageStats', lang) + '\n' +
            translator.t('validate.totalValidations', lang, { count: result.usage.totalValidations || 0 }) + '\n' +
            translator.t('validate.lastValidated', lang, { 
              date: result.usage.lastValidated ? 
                new Date(result.usage.lastValidated).toLocaleDateString() : 
                translator.t('validate.never', lang)
            });
        }

        // Add action buttons
        const keyboard = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: translator.t('validate.getDetails', lang), callback_data: `license_info_${licenseKey}` },
                { text: translator.t('validate.analytics', lang), callback_data: `license_analytics_${licenseKey}` }
              ],
              [
                { text: translator.t('validate.validateAgain', lang), callback_data: 'validate_license' }
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
        message = translator.t('validate.invalid', lang, {
          key: licenseKey,
          message: result.message || 'License key is invalid or expired'
        });

        const keyboard = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: translator.t('validate.tryAnotherKey', lang), callback_data: 'validate_license' },
                { text: translator.t('validate.getHelp', lang), callback_data: 'show_help' }
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
      
      const errorMessage = translator.t('validate.failed', lang, { error: error.message });

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: translator.t('validate.tryAgain', lang), callback_data: 'validate_license' },
              { text: translator.t('validate.getHelp', lang), callback_data: 'show_help' }
            ]
          ]
        }
      };

      // Check if loadingMsg exists before trying to edit it
      if (loadingMsg && loadingMsg.message_id) {
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
      } else {
        await bot.sendMessage(chatId, errorMessage, {
          parse_mode: 'Markdown',
          ...keyboard
        });
      }
    }
  }
};
