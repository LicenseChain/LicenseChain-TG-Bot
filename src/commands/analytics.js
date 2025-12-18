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
      // Get bot stats from local database
      const botStats = await dbManager.getBotStats();
      
      // Get licenses from LicenseChain API if app name is configured
      let apiLicenses = [];
      let appName = process.env.LICENSECHAIN_APP_NAME;
      
      if (appName) {
        try {
          // Try to get app first, or use appName directly as appId
          let appId = appName;
          try {
            const app = await licenseClient.getAppByName(appName);
            if (app && app.id) {
              appId = app.id;
            }
          } catch (appError) {
            // If app lookup fails, use appName as appId directly
            console.warn('Could not fetch app info, using appName as appId:', appError.message);
          }
          
          // Try to fetch licenses
          try {
            const licensesData = await licenseClient.getAppLicenses(appId);
            apiLicenses = licensesData?.licenses || licensesData || [];
          } catch (licenseError) {
            console.error('Error fetching licenses from API:', licenseError.message);
            // Continue with local stats if API fails
          }
        } catch (apiError) {
          console.error('Error fetching licenses from API:', apiError.message);
          // Continue with local stats if API fails
        }
      }
      
      const totalLicenses = apiLicenses.length > 0 ? apiLicenses.length : botStats.totalLicenses;
      const activeLicenses = apiLicenses.filter(l => l.status?.toLowerCase() === 'active').length;
      
      const analyticsMessage = `📊 *Analytics & Statistics*\n\n` +
        `*Overall Statistics:*\n` +
        `👥 Total Users: ${botStats.totalUsers}\n` +
        `📋 Total Licenses: ${totalLicenses}\n` +
        `✅ Active Licenses: ${activeLicenses}\n` +
        `⚡ Total Commands: ${botStats.totalCommands}\n\n` +
        `*Your Statistics:*\n` +
        `📋 Your Licenses: ${totalLicenses}\n` +
        `✅ Validations: ${botStats.totalCommands}\n\n` +
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
