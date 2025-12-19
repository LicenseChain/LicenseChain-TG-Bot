/**
 * Settings Command
 */

module.exports = {
  name: 'settings',
  description: 'Bot settings and preferences',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      // Get user settings
      const settings = await dbManager.getUserSettings(userId);
      
      const notificationsStatus = settings.notifications_enabled ? 'Enabled' : 'Disabled';
      const analyticsStatus = settings.analytics_enabled ? 'Enabled' : 'Disabled';
      const languageMap = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German'
      };
      const languageName = languageMap[settings.language] || settings.language || 'English';

      const settingsMessage = `⚙️ *Bot Settings*\n\n` +
        `*Current Settings:*\n` +
        `🔔 Notifications: ${notificationsStatus}\n` +
        `📊 Analytics: ${analyticsStatus}\n` +
        `🌐 Language: ${languageName}\n\n` +
        `*Tap buttons below to change settings:*`;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { 
                text: settings.notifications_enabled ? '🔔 Notifications: ON' : '🔕 Notifications: OFF',
                callback_data: `toggle_setting:notifications:${settings.notifications_enabled ? '0' : '1'}`
              }
            ],
            [
              { 
                text: settings.analytics_enabled ? '📊 Analytics: ON' : '📊 Analytics: OFF',
                callback_data: `toggle_setting:analytics:${settings.analytics_enabled ? '0' : '1'}`
              }
            ],
            [
              { text: '🌐 Language', callback_data: 'change_language' }
            ],
            [
              { text: '🔄 Refresh', callback_data: 'show_settings' }
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
      await bot.sendMessage(chatId, '❌ An error occurred while retrieving settings.');
    }
  }
};
