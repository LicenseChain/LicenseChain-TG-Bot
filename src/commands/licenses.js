/**
 * Licenses Command - Get user's licenses
 * Note: This conflicts with the existing license.js command
 * This handles /licenses <user-id> format
 */

module.exports = {
  name: 'licenses',
  description: 'Get user licenses',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    // Check admin permissions for viewing other users' licenses
    const adminUsers = process.env.ADMIN_USERS ? process.env.ADMIN_USERS.split(',').map(id => id.trim()) : [];
    const botOwnerId = process.env.BOT_OWNER_ID;
    const isAdmin = adminUsers.includes(userId.toString()) || userId.toString() === botOwnerId;

    // If no user ID provided, show current user's licenses
    const targetUserId = args.length > 0 ? args[0] : userId.toString();

    // Non-admins can only view their own licenses
    if (!isAdmin && targetUserId !== userId.toString()) {
      await bot.sendMessage(chatId, 
        '❌ *Access Denied*\n\n' +
        'You can only view your own licenses.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Fetching licenses...');

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
              // Filter licenses by email or issuedTo matching user
              // This is a simplified filter - adjust based on your data structure
              licenses = licenses.filter(license => {
                return license.issuedEmail || license.issuedTo;
              });
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

      // Format licenses list
      let message = `📋 *User Licenses*\n\n`;
      message += `User ID: \`${targetUserId}\`\n`;
      message += `Total: ${licenses.length} license${licenses.length !== 1 ? 's' : ''}\n\n`;

      // Show first 10 licenses
      const displayLicenses = licenses.slice(0, 10);
      displayLicenses.forEach((license, index) => {
        const status = license.status?.toUpperCase() === 'ACTIVE' ? '✅' : 
                      license.status?.toUpperCase() === 'EXPIRED' ? '❌' : '⚠️';
        const key = license.licenseKey || license.key || 'N/A';
        const shortKey = key.length > 20 ? key.substring(0, 17) + '...' : key;
        
        message += `${index + 1}. ${status} \`${shortKey}\`\n`;
        if (license.plan) message += `   Plan: ${license.plan}\n`;
        if (license.expiresAt) {
          const expiresDate = new Date(license.expiresAt);
          message += `   Expires: ${expiresDate.toLocaleDateString()}\n`;
        }
        message += `\n`;
      });

      if (licenses.length > 10) {
        message += `\n... and ${licenses.length - 10} more license${licenses.length - 10 !== 1 ? 's' : ''}`;
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

      await bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
    }
  }
};
