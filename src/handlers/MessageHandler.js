/**
 * Message Handler for Telegram Bot
 * Handles incoming messages and routes them appropriately
 */

const Logger = require('../utils/Logger');

class MessageHandler {
  constructor(bot, licenseClient, dbManager) {
    this.bot = bot;
    this.licenseClient = licenseClient;
    this.dbManager = dbManager;
    this.logger = new Logger('MessageHandler');
  }

  async loadHandlers() {
    try {
      // Handle text messages
      this.bot.on('message', async (msg) => {
        try {
          // Skip commands (handled by CommandHandler)
          if (msg.text && msg.text.startsWith('/')) {
            return;
          }

          // Handle text messages
          if (msg.text) {
            await this.handleTextMessage(msg);
          }

          // Handle photos
          if (msg.photo) {
            await this.handlePhotoMessage(msg);
          }

          // Handle documents
          if (msg.document) {
            await this.handleDocumentMessage(msg);
          }
        } catch (error) {
          this.logger.error('Error handling message:', error);
        }
      });

      // Handle callback queries
      this.bot.on('callback_query', async (query) => {
        try {
          await this.handleCallbackQuery(query);
        } catch (error) {
          this.logger.error('Error handling callback query:', error);
        }
      });

      this.logger.info('Message handlers loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load message handlers:', error);
      throw error;
    }
  }

  async handleTextMessage(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    this.logger.info(`Text message from user ${userId} in chat ${chatId}: ${text}`);

    // Check if it's a license key format
    if (this.isLicenseKey(text)) {
      await this.handleLicenseKeyInput(msg, text);
      return;
    }

    // Default response for other text messages
    await this.bot.sendMessage(chatId, 'I received your message! Use /help to see available commands or send me a license key to validate it.');
  }

  async handlePhotoMessage(msg) {
    const chatId = msg.chat.id;
    this.logger.info(`Photo received from user ${msg.from.id} in chat ${chatId}`);
    await this.bot.sendMessage(chatId, 'I received your photo! However, I can only process text messages and license keys. Please send me a license key or use the menu buttons.');
  }

  async handleDocumentMessage(msg) {
    const chatId = msg.chat.id;
    const fileName = msg.document.file_name || 'unknown';
    this.logger.info(`Document received from user ${msg.from.id} in chat ${chatId}: ${fileName}`);
    await this.bot.sendMessage(chatId, 'I received your document! However, I can only process text messages and license keys. Please send me a license key or use the menu buttons.');
  }

  async handleCallbackQuery(query) {
    const chatId = query.message.chat.id;
    const data = query.data;
    const userId = query.from.id;

    this.logger.info(`Callback query from user ${userId} in chat ${chatId}: ${data}`);

    try {
      // Parse callback data (format: action:param1:param2)
      const [action, ...params] = data.split(':');

      switch (action) {
        case 'validate_license':
          await this.handleValidateCallback(query, params);
          break;
        case 'create_license':
          await this.handleCreateCallback(query, params);
          break;
        case 'list_licenses':
          await this.handleListCallback(query, params);
          break;
        case 'show_help':
          await this.handleShowHelpCallback(query);
          break;
        case 'show_settings':
          await this.handleShowSettingsCallback(query);
          break;
        case 'show_profile':
          await this.handleShowProfileCallback(query);
          break;
        case 'show_analytics':
          await this.handleShowAnalyticsCallback(query);
          break;
        default:
          await this.bot.answerCallbackQuery(query.id, { text: 'Unknown action' });
          break;
      }
    } catch (error) {
      this.logger.error('Error handling callback query:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'An error occurred' });
    }
  }

  async handleLicenseKeyInput(msg, licenseKey) {
    const chatId = msg.chat.id;
    
    try {
      const response = await this.licenseClient.validateLicense(licenseKey);
      
      if (response && response.valid) {
        await this.bot.sendMessage(chatId, '✅ Your license is valid and active!');
      } else {
        const reason = response?.reason || 'License is invalid or expired';
        await this.bot.sendMessage(chatId, `❌ Sorry, ${reason.toLowerCase()}.`);
      }
    } catch (error) {
      this.logger.error('Error validating license key:', error);
      await this.bot.sendMessage(chatId, 'Sorry, there was an error validating your license.');
    }
  }

  async handleValidateCallback(query, params) {
    const [licenseKey] = params;
    
    if (!licenseKey) {
      // If no license key provided, ask user to send one
      await this.bot.answerCallbackQuery(query.id, { text: 'Please send me a license key to validate' });
      await this.bot.sendMessage(query.message.chat.id, '🔑 Please send me your license key to validate it.\n\nFormat: `LC-XXXXXX-XXXXXX-XXXXXX` or a 32-character alphanumeric key.', {
        parse_mode: 'Markdown'
      });
      return;
    }
    
    try {
      const response = await this.licenseClient.validateLicense(licenseKey);
      
      if (response && response.valid) {
        await this.bot.answerCallbackQuery(query.id, { text: '✅ License is valid!' });
        await this.bot.sendMessage(query.message.chat.id, '🎉 Your license is valid and active!');
      } else {
        await this.bot.answerCallbackQuery(query.id, { text: '❌ License is invalid' });
        await this.bot.sendMessage(query.message.chat.id, '❌ Sorry, this license is invalid or expired.');
      }
    } catch (error) {
      this.logger.error('Error validating license:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error validating license' });
    }
  }

  async handleShowHelpCallback(query) {
    try {
      await this.bot.answerCallbackQuery(query.id, { text: 'Help information' });
      
      const helpMessage = `📚 *LicenseChain Bot Help*\n\n` +
        `*Available Commands:*\n` +
        `/start - Start the bot and get welcome message\n` +
        `/help - Show this help message\n` +
        `/validate <key> - Validate a license key\n` +
        `/license - Manage your licenses\n` +
        `/analytics - View analytics and statistics\n` +
        `/profile - Manage your profile\n` +
        `/settings - Bot settings\n\n` +
        `*How to use:*\n` +
        `1. Send a license key directly to validate it\n` +
        `2. Use the menu buttons for quick actions\n` +
        `3. Type /help anytime for assistance\n\n` +
        `*Need more help?*\n` +
        `Visit: https://docs.licensechain.app/telegram-bot`;
      
      await this.bot.sendMessage(query.message.chat.id, helpMessage, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      this.logger.error('Error showing help:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error showing help' });
    }
  }

  async handleShowSettingsCallback(query) {
    try {
      await this.bot.answerCallbackQuery(query.id, { text: 'Settings' });
      
      const settingsMessage = `⚙️ *Bot Settings*\n\n` +
        `*Current Settings:*\n` +
        `🔔 Notifications: Enabled\n` +
        `📊 Analytics: Enabled\n` +
        `🌐 Language: English\n\n` +
        `*Available Options:*\n` +
        `Use /settings command to configure:\n` +
        `• Notification preferences\n` +
        `• Language settings\n` +
        `• Privacy options\n\n` +
        `*Note:* Settings are saved per user.`;
      
      await this.bot.sendMessage(query.message.chat.id, settingsMessage, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      this.logger.error('Error showing settings:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error showing settings' });
    }
  }

  async handleShowProfileCallback(query) {
    try {
      await this.bot.answerCallbackQuery(query.id, { text: 'Profile information' });
      
      const userId = query.from.id;
      const user = await this.dbManager.getUser(userId);
      
      if (!user) {
        // Create user if doesn't exist
        await this.dbManager.getOrCreateUser({
          id: userId,
          username: query.from.username,
          first_name: query.from.first_name,
          last_name: query.from.last_name
        });
        await this.bot.sendMessage(query.message.chat.id, '✅ Profile created! Use /profile again to see your information.');
        return;
      }
      
      // Get licenses from LicenseChain API if app name is configured
      let apiLicenses = [];
      let appName = process.env.LICENSECHAIN_APP_NAME;
      
      if (appName) {
        try {
          const app = await this.licenseClient.getAppByName(appName);
          if (app && app.id) {
            const licensesData = await this.licenseClient.getAppLicenses(app.id);
            apiLicenses = licensesData?.licenses || licensesData || [];
          }
        } catch (apiError) {
          this.logger.error('Error fetching licenses from API:', apiError);
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
      
      await this.bot.sendMessage(query.message.chat.id, profileMessage, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      this.logger.error('Error showing profile:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error showing profile' });
    }
  }

  async handleShowAnalyticsCallback(query) {
    try {
      await this.bot.answerCallbackQuery(query.id, { text: 'Loading analytics...' });
      
      // Get bot stats from local database
      const botStats = await this.dbManager.getBotStats();
      
      // Get licenses from LicenseChain API if app name is configured
      let apiLicenses = [];
      let appName = process.env.LICENSECHAIN_APP_NAME;
      
      if (appName) {
        try {
          const app = await this.licenseClient.getAppByName(appName);
          if (app && app.id) {
            const licensesData = await this.licenseClient.getAppLicenses(app.id);
            apiLicenses = licensesData?.licenses || licensesData || [];
          }
        } catch (apiError) {
          this.logger.error('Error fetching licenses from API:', apiError);
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
      
      await this.bot.sendMessage(query.message.chat.id, analyticsMessage, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      this.logger.error('Error showing analytics:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error showing analytics' });
    }
  }

  async handleCreateCallback(query, params) {
    await this.bot.answerCallbackQuery(query.id, { text: 'License creation not implemented yet' });
  }

  async handleListCallback(query, params) {
    await this.bot.answerCallbackQuery(query.id, { text: 'License listing not implemented yet' });
  }

  isLicenseKey(text) {
    // License key format: LC-XXXXXX-XXXXXX-XXXXXX (23 characters)
    // Or simple alphanumeric 32 characters
    if (text.length === 23 && text.startsWith('LC-')) {
      return /^LC-[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}$/.test(text);
    }
    return text.length === 32 && /^[A-Z0-9]+$/.test(text);
  }
}

module.exports = MessageHandler;
