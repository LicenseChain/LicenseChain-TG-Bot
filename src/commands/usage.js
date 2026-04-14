/**
 * Usage Command - Get usage analytics
 */

const Validator = require('../utils/Validator');

module.exports = {
  name: 'usage',
  description: 'Get usage analytics',

  async execute(msg, bot, licenseClient, dbManager, translator) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);
    const lang = await translator.getUserLanguage(userId);

    const rawTimeframe = (args[0] || '30d').toLowerCase();
    const validTimeframes = ['7d', '30d', '90d', '1y', 'all'];
    if (!validTimeframes.includes(rawTimeframe)) {
      await bot.sendMessage(chatId,
        translator.t('usage.invalidTimeframe', lang, { timeframes: validTimeframes.join(', ') }),
        { parse_mode: 'Markdown' }
      );
      return;
    }
    if (rawTimeframe !== 'all') {
      try {
        Validator.validatePeriod(rawTimeframe);
      } catch (err) {
        await bot.sendMessage(chatId, Validator.sanitizeForDisplay(err.message), { parse_mode: 'HTML' });
        return;
      }
    }
    const timeframe = rawTimeframe;

    try {
      const loadingMsg = await bot.sendMessage(chatId, translator.t('usage.fetching', lang));

      // Get bot statistics
      const stats = await dbManager.getBotStats();
      
      // Calculate timeframe dates
      const now = new Date();
      const timeframeMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365,
        'all': null
      };
      
      const days = timeframeMap[timeframe.toLowerCase()];
      const startDate = days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : null;

      // Get actual validation count from validations table (not all commands)
      const totalValidations = await dbManager.getValidationCount(null, startDate);
      const averageDaily = days ? Math.round(totalValidations / days) : totalValidations;

      // Try to get API analytics if available
      let apiAnalytics = null;
      try {
        apiAnalytics = await licenseClient.getAnalytics(timeframe, ['usage', 'validations']).catch(() => null);
      } catch (error) {
        console.warn('Could not fetch API analytics:', error.message);
      }

      const message = translator.t('usage.title', lang) + '\n\n' +
        translator.t('usage.timeframe', lang, { timeframe: timeframe.toUpperCase() }) + '\n' +
        (startDate ? translator.t('usage.from', lang, { date: startDate.toLocaleDateString() }) + '\n' : '') +
        translator.t('usage.to', lang, { date: now.toLocaleDateString() }) + '\n\n' +
        translator.t('usage.statistics', lang) + '\n' +
        translator.t('usage.totalValidations', lang, { count: apiAnalytics?.validations?.total || totalValidations }) + '\n' +
        translator.t('usage.dailyAverage', lang, { count: apiAnalytics?.validations?.dailyAverage || averageDaily }) + '\n' +
        translator.t('usage.peakUsage', lang, { peak: apiAnalytics?.validations?.peak || translator.t('usage.na', lang) }) + '\n' +
        translator.t('usage.commandsExecuted', lang, { count: stats.totalCommands || 0 }) + '\n\n' +
        translator.t('usage.trend', lang, { trend: apiAnalytics?.trend || translator.t('usage.stable', lang) });

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('Error getting usage analytics:', error);
      const lang = await translator.getUserLanguage(userId);
      await bot.sendMessage(chatId, 
        translator.t('usage.error', lang, { error: error.message }),
        { parse_mode: 'Markdown' }
      );
    }
  }
};
