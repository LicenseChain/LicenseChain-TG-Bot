/**
 * Start Command
 */

module.exports = {
  name: 'start',
  description: 'Start the bot and get help',
  
  async execute(msg, bot, licenseClient, dbManager, translator) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;

    try {
      // Register user if not exists
      await dbManager.getOrCreateUser({
        id: userId,
        username: username,
        first_name: msg.from.first_name,
        last_name: msg.from.last_name
      });

      const lang = await translator.getUserLanguage(userId);

      const welcomeMessage = translator.t('start.welcome', lang) + '\n\n' +
        translator.t('start.greeting', lang, { name: msg.from.first_name }) + '\n\n' +
        translator.t('start.whatICanDo', lang) + '\n' +
        translator.t('start.validateKeys', lang) + '\n' +
        translator.t('start.viewAnalytics', lang) + '\n' +
        translator.t('start.manageProfile', lang) + '\n' +
        translator.t('start.configureSettings', lang) + '\n' +
        translator.t('start.listLicenses', lang) + '\n\n' +
        translator.t('start.availableCommands', lang) + '\n' +
        translator.t('start.helpCommand', lang) + '\n' +
        translator.t('start.licenseCommand', lang) + '\n' +
        translator.t('start.validateCommand', lang) + '\n' +
        translator.t('start.analyticsCommand', lang) + '\n' +
        translator.t('start.profileCommand', lang) + '\n' +
        translator.t('start.settingsCommand', lang) + '\n\n' +
        translator.t('start.typeHelp', lang);

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: translator.t('start.validateLicense', lang), callback_data: 'validate_license' },
              { text: translator.t('start.analytics', lang), callback_data: 'show_analytics' }
            ],
            [
              { text: translator.t('start.profile', lang), callback_data: 'show_profile' },
              { text: translator.t('start.settings', lang), callback_data: 'show_settings' }
            ],
            [
              { text: translator.t('start.help', lang), callback_data: 'show_help' }
            ]
          ]
        }
      };

      await bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });

    } catch (error) {
      console.error('Error in start command:', error);
      const lang = await translator.getUserLanguage(userId);
      await bot.sendMessage(chatId, translator.t('start.error', lang));
    }
  }
};
