/**
 * Settings Command
 */

module.exports = {
  name: 'settings',
  description: 'Bot settings and preferences',
  
  async execute(msg, bot, licenseClient, dbManager, translator) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      // Get user settings
      const settings = await dbManager.getUserSettings(userId);
      const lang = await translator.getUserLanguage(userId);
      
      const notificationsStatus = settings.notifications_enabled 
        ? translator.t('settings.enabled', lang) 
        : translator.t('settings.disabled', lang);
      const analyticsStatus = settings.analytics_enabled 
        ? translator.t('settings.enabled', lang) 
        : translator.t('settings.disabled', lang);
      
      const languageMap = {
        'en': translator.t('settings.english', lang),
        'es': translator.t('settings.spanish', lang),
        'fr': translator.t('settings.french', lang),
        'de': translator.t('settings.german', lang),
        'zh': translator.t('settings.chinese', lang),
        'ja': translator.t('settings.japanese', lang),
        'ru': translator.t('settings.russian', lang),
        'et': translator.t('settings.estonian', lang),
        'pt': translator.t('settings.portuguese', lang),
        'it': translator.t('settings.italian', lang),
        'ko': translator.t('settings.korean', lang),
        'ca': translator.t('settings.catalan', lang),
        'eu': translator.t('settings.basque', lang),
        'gl': translator.t('settings.galician', lang),
        'ar': translator.t('settings.arabic', lang),
        'nl': translator.t('settings.dutch', lang),
        'id': translator.t('settings.indonesian', lang),
        'hi': translator.t('settings.hindi', lang),
        'bn': translator.t('settings.bengali', lang),
        'vi': translator.t('settings.vietnamese', lang)
      };
      const languageName = languageMap[settings.language] || settings.language || translator.t('settings.english', lang);

      const settingsMessage = translator.t('settings.title', lang) + '\n\n' +
        translator.t('settings.currentSettings', lang) + '\n' +
        translator.t('settings.notifications', lang, { status: notificationsStatus }) + '\n' +
        translator.t('settings.analytics', lang, { status: analyticsStatus }) + '\n' +
        translator.t('settings.language', lang, { name: languageName }) + '\n\n' +
        translator.t('settings.tapButtons', lang);

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { 
                text: settings.notifications_enabled 
                  ? translator.t('settings.notificationsOn', lang) 
                  : translator.t('settings.notificationsOff', lang),
                callback_data: `toggle_setting:notifications:${settings.notifications_enabled ? '0' : '1'}`
              }
            ],
            [
              { 
                text: settings.analytics_enabled 
                  ? translator.t('settings.analyticsOn', lang) 
                  : translator.t('settings.analyticsOff', lang),
                callback_data: `toggle_setting:analytics:${settings.analytics_enabled ? '0' : '1'}`
              }
            ],
            [
              { text: translator.t('settings.languageButton', lang), callback_data: 'change_language' }
            ],
            [
              { text: translator.t('settings.refresh', lang), callback_data: 'show_settings' }
            ]
          ]
        }
      };

      await bot.sendMessage(chatId, settingsMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.error('Error in settings command:', error);
      const lang = await translator.getUserLanguage(userId);
      await bot.sendMessage(chatId, translator.t('settings.error', lang));
    }
  }
};
