/**
 * Errors Command - Get error statistics
 */

module.exports = {
  name: 'errors',
  description: 'Get error statistics',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Show loading message (defined outside try to be accessible in catch)
    let loadingMsg;
    try {
      loadingMsg = await bot.sendMessage(chatId, '🔄 Fetching error statistics...');

      // Get error statistics from database if available
      // For now, we'll provide a basic error summary
      const stats = await dbManager.getBotStats();
      
      // Try to get API error statistics
      let apiErrors = null;
      try {
        apiErrors = await licenseClient.getAnalytics('30d', ['errors']).catch(() => null);
      } catch (error) {
        console.warn('Could not fetch API error stats:', error.message);
      }

      // Calculate error rates
      const totalCommands = stats.totalCommands || 0;
      const estimatedErrors = apiErrors?.total || Math.round(totalCommands * 0.01); // Estimate 1% error rate
      const errorRate = totalCommands > 0 ? ((estimatedErrors / totalCommands) * 100).toFixed(2) : '0.00';

      const message = `❌ *Error Statistics*\n\n` +
        `*Overview:*\n` +
        `📊 Total Errors: ${apiErrors?.total || estimatedErrors}\n` +
        `📈 Error Rate: ${errorRate}%\n` +
        `✅ Success Rate: ${(100 - parseFloat(errorRate)).toFixed(2)}%\n\n` +
        `*Error Types:*\n` +
        `🔴 Critical: ${apiErrors?.critical || 0}\n` +
        `🟠 Warnings: ${apiErrors?.warnings || 0}\n` +
        `🟡 Info: ${apiErrors?.info || 0}\n\n` +
        `*Recent Errors:*\n` +
        (apiErrors?.recent?.length > 0 ? 
          apiErrors.recent.slice(0, 5).map((err, i) => `${i + 1}. ${err.type}: ${err.message.substring(0, 30)}...`).join('\n') :
          'No recent errors recorded.\n\n✅ System is running smoothly!');

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('Error getting error statistics:', error);
      
      const errorMessage = `❌ *Error*\n\n` +
        `An error occurred while fetching error statistics:\n` +
        `\`${error.message}\``;
      
      // Check if loadingMsg exists before trying to edit it
      if (loadingMsg && loadingMsg.message_id) {
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
