/**
 * Create License Command (Admin only)
 */

const Validator = require('../utils/Validator');
const PermissionManager = require('../utils/PermissionManager');

module.exports = {
  name: 'create',
  description: 'Create a new license (Admin only)',

  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    const permissionManager = new PermissionManager();
    try {
      permissionManager.requirePermission(userId, 'admin');
    } catch (err) {
      await bot.sendMessage(chatId, '❌ ' + (err.message || 'Access denied. Administrators only.'), { parse_mode: 'Markdown' });
      return;
    }

    // Parse command: /create <user-id> <features> <expires>
    // user-id: name for issuedTo or email for issuedEmail (can be multiple words)
    // features: plan (FREE, PRO, BUSINESS, ENTERPRISE)
    // expires: expiration date (YYYY-MM-DD format) or number of days
    if (args.length < 3) {
      await bot.sendMessage(chatId, 
        '❌ *Usage:* `/create <user-id> <features> <expires>`\n\n' +
        'Example: `/create tester FREE 2026-12-31`\n' +
        'Example: `/create user@example.com PRO 30`\n' +
        'Example: `/create John Doe BUSINESS 365`\n\n' +
        '*user-id:* Name or email address (can be multiple words)\n' +
        '*features:* FREE, PRO, BUSINESS, ENTERPRISE\n' +
        '*expires:* Date (YYYY-MM-DD) or days from now',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Parse arguments: last 2 are plan and expires, everything before is user-id
    const plan = args[args.length - 2].toUpperCase();
    const expiresInput = args[args.length - 1];
    const userIdentifier = args.slice(0, args.length - 2).join(' '); // Join all words except last 2

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

    // Determine if userIdentifier is an email or name; validate email if applicable
    let issuedTo = null;
    let issuedEmail = null;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userIdentifier);
    if (isEmail) {
      try {
        issuedEmail = Validator.validateEmail(userIdentifier);
      } catch (err) {
        await bot.sendMessage(chatId, '❌ ' + Validator.sanitizeForDisplay(err.message), { parse_mode: 'HTML' });
        return;
      }
    } else {
      issuedTo = Validator.sanitizeForDisplay(userIdentifier) || userIdentifier;
    }

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
