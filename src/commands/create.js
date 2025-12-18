/**
 * Create License Command (Admin only)
 */

module.exports = {
  name: 'create',
  description: 'Create a new license (Admin only)',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

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

    // Parse command: /create <user-id> <features> <expires>
    // Simplified: /create <plan> [expires-days]
    if (args.length === 0) {
      await bot.sendMessage(chatId, 
        '❌ *Usage:* `/create <plan> [expires-days]`\n\n' +
        'Example: `/create FREE 30`\n' +
        'Example: `/create PRO 365`\n\n' +
        'Plans: FREE, PRO, BUSINESS, ENTERPRISE\n' +
        'If expires-days is not provided, license will not expire.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const plan = args[0].toUpperCase();
    const expiresDays = args[1] ? parseInt(args[1]) : null;

    // Validate plan
    const validPlans = ['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'];
    if (!validPlans.includes(plan)) {
      await bot.sendMessage(chatId, 
        `❌ *Invalid Plan*\n\n` +
        `Plan must be one of: ${validPlans.join(', ')}\n` +
        `You provided: ${plan}`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    let loadingMsg = null;
    try {
      loadingMsg = await bot.sendMessage(chatId, '🔄 Creating license...');

      // Get app name from environment
      const appName = process.env.LICENSECHAIN_APP_NAME;
      if (!appName) {
        await bot.editMessageText(
          '❌ *Configuration Error*\n\n' +
          'LICENSECHAIN_APP_NAME is not configured.',
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
        return;
      }

      // Get app ID
      let appId = appName;
      try {
        const app = await licenseClient.getAppByName(appName);
        if (app && app.id) {
          appId = app.id;
        }
      } catch (appError) {
        console.warn('Could not fetch app info, using appName as appId:', appError.message);
      }

      // Calculate expiration date
      let expiresAt = null;
      if (expiresDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresDays);
        expiresAt = expiresAt.toISOString();
      }

      // Create license data (appId is passed as URL parameter, not in body)
      const licenseData = {
        plan: plan,
        expiresAt: expiresAt
      };

      // Create license via API (endpoint: /v1/apps/:appId/licenses)
      const result = await licenseClient.createLicense(appId, licenseData);

      let message = `✅ *License Created*\n\n` +
        `*License Key:* \`${result.licenseKey || result.key || 'N/A'}\`\n` +
        `*Plan:* ${plan}\n` +
        `*Status:* Active\n`;

      if (expiresAt) {
        message += `*Expires:* ${new Date(expiresAt).toLocaleDateString()}\n`;
      } else {
        message += `*Expires:* Never\n`;
      }

      if (result.id) {
        message += `*License ID:* ${result.id}\n`;
      }

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📋 View License', callback_data: `license_info_${result.licenseKey || result.key}` },
              { text: '🔄 Create Another', callback_data: 'create_license' }
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
      console.error('Error creating license:', error);
      
      const errorMessage = `❌ *Creation Failed*\n\n` +
        `An error occurred while creating the license:\n` +
        `\`${error.message}\`\n\n` +
        `Please check the API configuration and try again.`;

      // Check if loadingMsg exists before trying to edit it
      if (typeof loadingMsg !== 'undefined' && loadingMsg && loadingMsg.message_id) {
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
