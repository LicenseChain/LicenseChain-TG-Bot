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
    // user-id: name for issuedTo or email for issuedEmail
    // features: plan (FREE, PRO, BUSINESS, ENTERPRISE)
    // expires: expiration date (YYYY-MM-DD format) or number of days
    if (args.length < 3) {
      await bot.sendMessage(chatId, 
        '❌ *Usage:* `/create <user-id> <features> <expires>`\n\n' +
        'Example: `/create tester FREE 2025-12-31`\n' +
        'Example: `/create user@example.com PRO 30`\n' +
        'Example: `/create John Doe BUSINESS 365`\n\n' +
        '*user-id:* Name or email address\n' +
        '*features:* FREE, PRO, BUSINESS, ENTERPRISE\n' +
        '*expires:* Date (YYYY-MM-DD) or days from now',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const userId = args[0]; // Can be name or email
    const plan = args[1].toUpperCase();
    const expiresInput = args[2];

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

    // Determine if userId is an email or name
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userId);
    const issuedTo = isEmail ? null : userId;
    const issuedEmail = isEmail ? userId : null;

    // Parse expiration date
    let expiresAt = null;
    if (expiresInput) {
      // Check if it's a date string (YYYY-MM-DD format)
      const dateMatch = expiresInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        expiresAt = new Date(year, parseInt(month) - 1, day);
        if (isNaN(expiresAt.getTime())) {
          await bot.sendMessage(chatId,
            '❌ *Invalid Date*\n\n' +
            `Date format must be YYYY-MM-DD\n` +
            `You provided: ${expiresInput}`,
            { parse_mode: 'Markdown' }
          );
          return;
        }
        expiresAt = expiresAt.toISOString();
      } else {
        // Try parsing as number of days
        const expiresDays = parseInt(expiresInput);
        if (isNaN(expiresDays) || expiresDays < 1) {
          await bot.sendMessage(chatId,
            '❌ *Invalid Expiration*\n\n' +
            `Expiration must be a date (YYYY-MM-DD) or number of days\n` +
            `You provided: ${expiresInput}`,
            { parse_mode: 'Markdown' }
          );
          return;
        }
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresDays);
        expiresAt = expiresAt.toISOString();
      }
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

      // Create license data (API requires appId in body even though it's in URL)
      // Only include expiresAt if it's not null (API schema validation rejects null for date-time)
      const licenseData = {
        appId: appId,
        plan: plan
      };
      
      if (issuedTo) {
        licenseData.issuedTo = issuedTo;
      }
      
      if (issuedEmail) {
        licenseData.issuedEmail = issuedEmail;
      }
      
      if (expiresAt) {
        licenseData.expiresAt = expiresAt;
      }

      // Create license via API (endpoint: /v1/apps/:appId/licenses)
      const result = await licenseClient.createLicense(appId, licenseData);

      let message = `✅ *License Created*\n\n` +
        `*License Key:* \`${result.licenseKey || result.key || 'N/A'}\`\n` +
        `*Plan:* ${plan}\n` +
        `*Status:* Active\n`;

      if (issuedTo) {
        message += `*Issued To:* ${issuedTo}\n`;
      }
      
      if (issuedEmail) {
        message += `*Email:* ${issuedEmail}\n`;
      }

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
