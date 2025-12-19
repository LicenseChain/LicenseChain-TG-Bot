/**
 * Usage Command - Get usage analytics
 */

module.exports = {
  name: 'usage',
  description: 'Get usage analytics',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    // Parse timeframe (optional)
    const timeframe = args[0] || '30d'; // Default to 30 days
    const validTimeframes = ['7d', '30d', '90d', '1y', 'all'];
    
    if (!validTimeframes.includes(timeframe.toLowerCase())) {
      await bot.sendMessage(chatId, 
        `❌ *Invalid Timeframe*\n\n` +
        `Timeframe must be one of: ${validTimeframes.join(', ')}\n` +
        `Usage: \`/usage [timeframe]\`\n` +
        `Example: \`/usage 7d\``,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Fetching usage analytics...');

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

      const message = `📊 *Usage Analytics*\n\n` +
        `*Timeframe:* ${timeframe.toUpperCase()}\n` +
        (startDate ? `*From:* ${startDate.toLocaleDateString()}\n` : '') +
        `*To:* ${now.toLocaleDateString()}\n\n` +
        `*Statistics:*\n` +
        `🔢 Total Validations: ${apiAnalytics?.validations?.total || totalValidations}\n` +
        `📈 Daily Average: ${apiAnalytics?.validations?.dailyAverage || averageDaily}\n` +
        `📊 Peak Usage: ${apiAnalytics?.validations?.peak || 'N/A'}\n` +
        `⚡ Commands Executed: ${stats.totalCommands || 0}\n\n` +
        `*Trend:* ${apiAnalytics?.trend || 'Stable'}`;

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('Error getting usage analytics:', error);
      await bot.sendMessage(chatId, 
        `❌ *Error*\n\n` +
        `An error occurred while fetching usage analytics:\n` +
        `\`${error.message}\``,
        { parse_mode: 'Markdown' }
      );
    }
  }
};
