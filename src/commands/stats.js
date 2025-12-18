/**
 * Stats Command - Get bot statistics (Admin only)
 */

module.exports = {
  name: 'stats',
  description: 'Get bot statistics (Admin only)',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Check admin permissions
    const adminUsers = process.env.ADMIN_USERS ? process.env.ADMIN_USERS.split(',').map(id => id.trim()) : [];
    const botOwnerId = process.env.BOT_OWNER_ID;
    
    if (!adminUsers.includes(userId.toString()) && userId.toString() !== botOwnerId) {
      await bot.sendMessage(chatId, 
        '❌ *Access Denied*\n\n' +
        'This command is restricted to administrators only.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Fetching statistics...');

      // Get bot statistics
      const stats = await dbManager.getBotStats();
      
      // Get licenses from API if available
      let apiLicenses = [];
      const appName = process.env.LICENSECHAIN_APP_NAME;
      
      if (appName) {
        try {
          let appId = appName;
          try {
            const app = await licenseClient.getAppByName(appName);
            if (app && app.id) {
              appId = app.id;
            }
          } catch (appError) {
            console.warn('Could not fetch app info:', appError.message);
          }

          try {
            const licensesData = await licenseClient.getAppLicenses(appId);
            apiLicenses = licensesData?.licenses || licensesData || [];
          } catch (licenseError) {
            console.error('Error fetching licenses:', licenseError.message);
          }
        } catch (apiError) {
          console.error('Error fetching API data:', apiError.message);
        }
      }

      const totalLicenses = apiLicenses.length > 0 ? apiLicenses.length : stats.totalLicenses;
      const activeLicenses = apiLicenses.filter(l => l.status?.toLowerCase() === 'active').length;
      const expiredLicenses = apiLicenses.filter(l => l.status?.toLowerCase() === 'expired').length;
      const revokedLicenses = apiLicenses.filter(l => l.status?.toLowerCase() === 'revoked').length;

      const message = `📊 *Bot Statistics*\n\n` +
        `*Users:*\n` +
        `👥 Total Users: ${stats.totalUsers}\n\n` +
        `*Licenses:*\n` +
        `📋 Total: ${totalLicenses}\n` +
        `✅ Active: ${activeLicenses}\n` +
        `❌ Expired: ${expiredLicenses}\n` +
        `🚫 Revoked: ${revokedLicenses}\n\n` +
        `*Commands:*\n` +
        `⚡ Total Executed: ${stats.totalCommands}\n\n` +
        `*Last Updated:* ${new Date().toLocaleString()}`;

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('Error getting statistics:', error);
      await bot.sendMessage(chatId, 
        `❌ *Error*\n\n` +
        `An error occurred while fetching statistics:\n` +
        `\`${error.message}\``,
        { parse_mode: 'Markdown' }
      );
    }
  }
};
