/**
 * Licenses Command - Get license analytics with optional timeframe
 * Supports: /licenses [timeframe] or /licenses <user-id> [timeframe]
 */

module.exports = {
  name: 'licenses',
  description: 'Get license analytics',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    // Check admin permissions for viewing other users' licenses
    const PermissionManager = require('../utils/PermissionManager');
    const permissionManager = new PermissionManager();
    const isAdmin = permissionManager.isAdmin(userId);

    // Parse arguments: could be [timeframe] or [user-id] [timeframe]
    let targetUserId = userId.toString();
    let timeframe = '30d'; // Default timeframe
    
    const validTimeframes = ['7d', '30d', '90d', '1y', 'all'];
    
    // Check if first arg is a timeframe
    if (args.length > 0 && validTimeframes.includes(args[0].toLowerCase())) {
      timeframe = args[0].toLowerCase();
    } 
    // Check if first arg is a user ID (numeric)
    else if (args.length > 0 && /^\d+$/.test(args[0])) {
      targetUserId = args[0];
      // Check if second arg is a timeframe
      if (args.length > 1 && validTimeframes.includes(args[1].toLowerCase())) {
        timeframe = args[1].toLowerCase();
      }
    }
    // If first arg doesn't match timeframe or user ID, assume it's a timeframe attempt
    else if (args.length > 0) {
      await bot.sendMessage(chatId, 
        '❌ *Invalid Arguments*\n\n' +
        'Usage: `/licenses [timeframe]`\n' +
        'Usage: `/licenses <user-id> [timeframe]` (Admin only)\n\n' +
        'Timeframes: 7d, 30d, 90d, 1y, all\n\n' +
        'Examples:\n' +
        '  `/licenses` - Show analytics for last 30 days\n' +
        '  `/licenses 7d` - Show analytics for last 7 days\n' +
        '  `/licenses 123456789 90d` - Show user analytics (Admin only)',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Non-admins can only view their own licenses
    if (!isAdmin && targetUserId !== userId.toString()) {
      await bot.sendMessage(chatId, 
        '❌ *Access Denied*\n\n' +
        'You can only view your own license analytics.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Show loading message (defined outside try to be accessible in catch)
    let loadingMsg;
    try {
      loadingMsg = await bot.sendMessage(chatId, '🔄 Fetching license analytics...');

      // Get app name from environment
      const appName = process.env.LICENSECHAIN_APP_NAME;
      let licenses = [];
      let licenseError = null;
      let apiError = null;

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
            console.warn('Could not fetch app info, using appName as appId:', appError.message);
          }

          // Fetch licenses for the app
          try {
            const licensesData = await licenseClient.getAppLicenses(appId);
            licenses = licensesData?.licenses || licensesData || [];
            
            // Filter by user if not admin viewing all
            if (!isAdmin || targetUserId !== userId.toString()) {
              if (isAdmin && targetUserId !== userId.toString()) {
                // Admin viewing specific user - filter by user identifier
                // Try to match by email or issuedTo
                licenses = licenses.filter(license => {
                  const userStr = targetUserId.toString();
                  return license.issuedEmail === userStr || 
                         license.issuedTo === userStr || 
                         license.email === userStr;
                });
              } else {
                // Filter licenses by email or issuedTo matching user
                // For Telegram user IDs, we need to match by email or issuedTo
                // This is a simplified filter - in practice, you'd match by user's email
                licenses = licenses.filter(license => {
                  // Match if license has email or issuedTo that could belong to this user
                  // Note: This is a placeholder - implement proper user-to-license matching
                  return license.issuedEmail || license.issuedTo || license.email;
                });
              }
            }
          } catch (err) {
            licenseError = err;
            console.error('Error fetching licenses from API:', err.message);
          }
        } catch (err) {
          apiError = err;
          console.error('Error fetching licenses:', err.message);
        }
      }

      // If no licenses found via API, try to show a helpful message
      if (licenses.length === 0) {
        // Check if API call failed due to auth
        const apiFailed = licenseError || apiError;
        
        if (apiFailed) {
          await bot.editMessageText(
            `📋 *User Licenses*\n\n` +
            `⚠️ Could not fetch licenses from API.\n` +
            `*Reason:* API authentication failed\n\n` +
            `*Note:* The bot is configured but API authentication needs to be set up.\n` +
            `Please check your LICENSE_CHAIN_API_KEY configuration.\n\n` +
            `User \`${targetUserId}\` may have licenses, but they cannot be retrieved at this time.`,
            {
              chat_id: chatId,
              message_id: loadingMsg.message_id,
              parse_mode: 'Markdown'
            }
          );
        } else {
          await bot.editMessageText(
            `📋 *User Licenses*\n\n` +
            `User \`${targetUserId}\` has no licenses.\n\n` +
            `Use /create to create a new license (Admin only).`,
            {
              chat_id: chatId,
              message_id: loadingMsg.message_id,
              parse_mode: 'Markdown'
            }
          );
        }
        return;
      }

      // Calculate timeframe dates
      const now = new Date();
      const timeframeMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365,
        'all': null
      };
      
      const days = timeframeMap[timeframe];
      const startDate = days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : null;

      // Filter licenses by timeframe if applicable
      let filteredLicenses = licenses;
      if (startDate) {
        filteredLicenses = licenses.filter(license => {
          const createdAt = license.createdAt ? new Date(license.createdAt) : null;
          return !createdAt || createdAt >= startDate;
        });
      }

      // Calculate analytics
      const totalLicenses = filteredLicenses.length;
      const activeLicenses = filteredLicenses.filter(l => l.status?.toUpperCase() === 'ACTIVE').length;
      const expiredLicenses = filteredLicenses.filter(l => l.status?.toUpperCase() === 'EXPIRED').length;
      const revokedLicenses = filteredLicenses.filter(l => l.status?.toUpperCase() === 'REVOKED').length;
      const suspendedLicenses = filteredLicenses.filter(l => l.status?.toUpperCase() === 'SUSPENDED').length;

      // Group by plan
      const planStats = {};
      filteredLicenses.forEach(license => {
        const plan = license.plan || 'UNKNOWN';
        planStats[plan] = (planStats[plan] || 0) + 1;
      });

      // Try to get API analytics if available
      let apiAnalytics = null;
      try {
        apiAnalytics = await licenseClient.getAnalytics(timeframe, ['licenses']).catch(() => null);
      } catch (error) {
        console.warn('Could not fetch API analytics:', error.message);
      }

      // Format analytics message
      let message = `📊 *License Analytics*\n\n`;
      
      if (isAdmin && targetUserId !== userId.toString()) {
        message += `*User ID:* \`${targetUserId}\`\n`;
      }
      
      message += `*Timeframe:* ${timeframe.toUpperCase()}\n`;
      if (startDate) {
        message += `*From:* ${startDate.toLocaleDateString()}\n`;
      }
      message += `*To:* ${now.toLocaleDateString()}\n\n`;
      
      message += `*Overview:*\n`;
      message += `📋 Total Licenses: ${totalLicenses}\n`;
      message += `✅ Active: ${activeLicenses}\n`;
      message += `❌ Expired: ${expiredLicenses}\n`;
      message += `🚫 Revoked: ${revokedLicenses}\n`;
      if (suspendedLicenses > 0) {
        message += `⚠️ Suspended: ${suspendedLicenses}\n`;
      }
      
      if (Object.keys(planStats).length > 0) {
        message += `\n*By Plan:*\n`;
        Object.entries(planStats).forEach(([plan, count]) => {
          message += `  ${plan}: ${count}\n`;
        });
      }

      if (apiAnalytics?.licenses) {
        message += `\n*API Analytics:*\n`;
        if (apiAnalytics.licenses.total) message += `Total: ${apiAnalytics.licenses.total}\n`;
        if (apiAnalytics.licenses.growth) message += `Growth: ${apiAnalytics.licenses.growth}%\n`;
        if (apiAnalytics.licenses.trend) message += `Trend: ${apiAnalytics.licenses.trend}\n`;
      }

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('Error listing licenses:', error);
      
      const errorMessage = `❌ *Error*\n\n` +
        `An error occurred while fetching licenses:\n` +
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
