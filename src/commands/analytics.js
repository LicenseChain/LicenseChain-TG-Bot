/**
 * Analytics Command
 */

module.exports = {
  name: 'analytics',
  description: 'View analytics and statistics',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      const stats = await dbManager.getBotStats();
      
      const analyticsMessage = `📊 *Analytics & Statistics*\n\n` +
        `*Overall Statistics:*\n` +
        `👥 Total Users: ${stats.totalUsers}\n` +
        `📋 Total Licenses: ${stats.totalLicenses}\n` +
        `⚡ Total Commands: ${stats.totalCommands}\n\n` +
        `*Your Statistics:*\n` +
        `📋 Your Licenses: 0\n` +
        `✅ Validations: 0\n\n` +
        `Use /analytics for detailed analytics.`;

      await bot.sendMessage(chatId, analyticsMessage, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('Error in analytics command:', error);
      await bot.sendMessage(chatId, '❌ An error occurred while retrieving analytics.');
    }
  }
};
