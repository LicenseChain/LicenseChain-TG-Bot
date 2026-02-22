/**
 * Status Command - Get bot status (Admin only)
 */

module.exports = {
  name: 'status',
  description: 'Get bot status (Admin only)',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const PermissionManager = require('../utils/PermissionManager');
    try {
      new PermissionManager().requirePermission(userId, 'admin');
    } catch (err) {
      await bot.sendMessage(chatId, '❌ Access denied. Administrators only.', { parse_mode: 'Markdown' });
      return;
    }

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Checking bot status...');

      // Get bot status from database
      const botStatus = await dbManager.getBotStatus();
      const statusEmoji = botStatus === 'online' ? '✅' : 
                          botStatus === 'offline' ? '❌' : 
                          botStatus === 'maintenance' ? '⚠️' : '⚪';

      // Get bot statistics from local DB
      const stats = await dbManager.getBotStats();
      
      // Fetch licenses from API to get accurate counts
      let totalLicenses = stats.totalLicenses;
      let uniqueUsers = stats.totalUsers;
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
            const licenses = licensesData?.licenses || licensesData || [];
            totalLicenses = licenses.length;
            
            // Count unique users from licenses
            const userSet = new Set();
            licenses.forEach(license => {
              // Add issuedTo if present
              if (license.issuedTo) {
                userSet.add(license.issuedTo);
              }
              // Add issuedEmail if present
              if (license.issuedEmail) {
                userSet.add(license.issuedEmail);
              }
              // Add email field if present (fallback)
              if (license.email) {
                userSet.add(license.email);
              }
            });
            uniqueUsers = userSet.size;
          } catch (licenseError) {
            console.error('Error fetching licenses:', licenseError.message);
          }
        } catch (apiError) {
          console.error('Error fetching API data:', apiError.message);
        }
      }
      
      // Check API health
      let apiStatus = '❌ Unknown';
      try {
        await licenseClient.healthCheck();
        apiStatus = '✅ Online';
      } catch (error) {
        apiStatus = `❌ Error: ${error.message.substring(0, 30)}...`;
      }

      // Get system info
      const uptime = process.uptime();
      const uptimeHours = Math.floor(uptime / 3600);
      const uptimeMinutes = Math.floor((uptime % 3600) / 60);
      const memoryUsage = process.memoryUsage();
      const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

      const message = `📊 *Bot Status*\n\n` +
        `*Bot Status:* ${statusEmoji} ${botStatus.toUpperCase()}\n` +
        `*API Status:* ${apiStatus}\n` +
        `*Uptime:* ${uptimeHours}h ${uptimeMinutes}m\n` +
        `*Memory Usage:* ${memoryMB} MB\n\n` +
        `*Statistics:*\n` +
        `👥 Total Users: ${uniqueUsers}\n` +
        `📋 Total Licenses: ${totalLicenses}\n` +
        `⚡ Total Commands: ${stats.totalCommands}\n\n` +
        `*Environment:*\n` +
        `App Name: ${process.env.LICENSECHAIN_APP_NAME || 'Not set'}\n` +
        `Node Version: ${process.version}\n` +
        `Port: ${process.env.PORT || 3005}`;

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('Error getting bot status:', error);
      await bot.sendMessage(chatId, 
        `❌ *Error*\n\n` +
        `An error occurred while checking bot status:\n` +
        `\`${error.message}\``,
        { parse_mode: 'Markdown' }
      );
    }
  }
};
