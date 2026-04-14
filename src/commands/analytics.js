/**
 * Analytics Command
 */

module.exports = {
  name: 'analytics',
  description: 'View analytics and statistics',
  
  async execute(msg, bot, licenseClient, dbManager, translator) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const lang = await translator.getUserLanguage(userId);

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
      const expiredLicenses = apiLicenses.filter(l => l.status?.toUpperCase() === 'EXPIRED').length;
      const revokedLicenses = apiLicenses.filter(l => l.status?.toUpperCase() === 'REVOKED').length;
      const suspendedLicenses = apiLicenses.filter(l => l.status?.toUpperCase() === 'SUSPENDED').length;
      
      // Get actual validation count (not all commands)
      const totalValidations = await dbManager.getValidationCount();
      const userValidations = await dbManager.getValidationCount(userId);
      
      // Calculate license statistics by plan
      const planStats = {};
      apiLicenses.forEach(license => {
        const plan = license.plan || 'FREE';
        planStats[plan] = (planStats[plan] || 0) + 1;
      });
      
      // Calculate recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentLicenses = apiLicenses.filter(l => {
        if (!l.createdAt) return false;
        return new Date(l.createdAt) >= sevenDaysAgo;
      }).length;
      
      const analyticsMessage = `📊 *Detailed Analytics*\n\n` +
        `*Overall Statistics:*\n` +
        `👥 Total Users: ${botStats.totalUsers}\n` +
        `📋 Total Licenses: ${totalLicenses}\n` +
        `✅ Active: ${activeLicenses}\n` +
        `❌ Expired: ${expiredLicenses}\n` +
        `🚫 Revoked: ${revokedLicenses}\n` +
        `${suspendedLicenses > 0 ? `⚠️ Suspended: ${suspendedLicenses}\n` : ''}` +
        `⚡ Total Commands: ${botStats.totalCommands}\n` +
        `✅ Total Validations: ${totalValidations}\n\n` +
        `*Your Statistics:*\n` +
        `📋 Your Licenses: ${totalLicenses}\n` +
        `✅ Your Validations: ${userValidations}\n\n` +
        `*License Distribution:*\n` +
        (Object.keys(planStats).length > 0 
          ? Object.entries(planStats).map(([plan, count]) => `  ${plan}: ${count}`).join('\n')
          : '  No plan data available') +
        `\n\n` +
        `*Recent Activity (7 days):*\n` +
        `📋 New Licenses: ${recentLicenses}\n` +
        `📈 Growth Rate: ${totalLicenses > 0 ? ((recentLicenses / totalLicenses) * 100).toFixed(1) : 0}%\n\n` +
        `Use /usage [timeframe] for usage analytics.\n` +
        `Use /performance for performance metrics.`;

      await bot.sendMessage(chatId, analyticsMessage, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('Error in analytics command:', error);
      const lang = await translator.getUserLanguage(userId);
      await bot.sendMessage(chatId, translator.t('analytics.error', lang));
    }
  }
};
