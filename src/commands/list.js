/**
 * List Licenses Command
 * Supports both /m licenses and /list commands
 */

module.exports = {
  name: 'list',
  description: 'List user licenses',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    try {
      // Check if command is /m licenses
      if (msg.text.toLowerCase().startsWith('/m licenses') || 
          (msg.text.toLowerCase().startsWith('/m') && args[0]?.toLowerCase() === 'licenses')) {
        // Handle /m licenses command
        await this.listUserLicenses(msg, bot, licenseClient, dbManager);
        return;
      }

      // Regular /list command
      await this.listUserLicenses(msg, bot, licenseClient, dbManager);
    } catch (error) {
      console.error('Error listing licenses:', error);
      await bot.sendMessage(chatId, '❌ An error occurred while listing licenses.');
    }
  },

  async listUserLicenses(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Fetching licenses...');

      // Get app name from environment
      const appName = process.env.LICENSECHAIN_APP_NAME;
      let licenses = [];

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
          } catch (licenseError) {
            console.error('Error fetching licenses from API:', licenseError.message);
          }
        } catch (apiError) {
          console.error('Error fetching licenses:', apiError.message);
        }
      }

      if (licenses.length === 0) {
        await bot.editMessageText(
          `📋 *Your Licenses*\n\n` +
          `You currently have no licenses.\n\n` +
          `Use /create to create a new license (Admin only) or contact support for assistance.`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
        return;
      }

      // Format licenses list
      let message = `📋 *Your Licenses*\n\n`;
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

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Refresh', callback_data: 'list_licenses' },
              { text: '📊 Analytics', callback_data: 'show_analytics' }
            ],
            [
              { text: '❓ Help', callback_data: 'show_help' }
            ]
          ]
        }
      };

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown',
        ...keyboard
      });

    } catch (error) {
      console.error('Error listing licenses:', error);
      await bot.sendMessage(chatId, 
        `❌ *Error*\n\n` +
        `An error occurred while listing licenses:\n` +
        `\`${error.message}\``,
        { parse_mode: 'Markdown' }
      );
    }
  }
};
