/**
 * Profile Command
 */

module.exports = {
  name: 'profile',
  description: 'Manage your profile',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      // Get or create user in local database
      const user = await dbManager.getOrCreateUser({
        id: userId,
        username: msg.from.username,
        first_name: msg.from.first_name,
        last_name: msg.from.last_name
      });
      
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
      
      const totalLicenses = apiLicenses.length;
      const activeLicenses = apiLicenses.filter(l => l.status?.toLowerCase() === 'active').length;
      
      const profileMessage = `👤 *Your Profile*\n\n` +
        `*User ID:* ${user.telegram_id}\n` +
        `*Username:* ${user.username || 'Not set'}\n` +
        `*Name:* ${user.first_name || ''} ${user.last_name || ''}\n` +
        `*Member since:* ${new Date(user.created_at).toLocaleDateString()}\n\n` +
        `*Statistics:*\n` +
        `📋 Licenses: ${totalLicenses}\n` +
        `✅ Active Licenses: ${activeLicenses}\n` +
        `✅ Validations: 0\n\n` +
        `Use /profile to update your information.`;

      await bot.sendMessage(chatId, profileMessage, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('Error in profile command:', error);
      await bot.sendMessage(chatId, '❌ An error occurred while retrieving your profile.');
    }
  }
};
