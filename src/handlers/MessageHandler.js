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

    // Check bot status
    try {
      const botStatus = await this.dbManager.getBotStatus();
      if (botStatus === 'offline') {
        await this.bot.sendMessage(chatId, 
          '❌ *Bot is Offline*\n\n' +
          'The bot is currently offline and not accepting messages.\n' +
          'Please contact an administrator or try again later.',
          { parse_mode: 'Markdown' }
        );
        return;
      }
    } catch (error) {
      console.error('Error checking bot status:', error);
      // Continue if status check fails
    }

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
      // Check bot status
      const botStatus = await this.dbManager.getBotStatus();
      if (botStatus === 'offline') {
        await this.bot.answerCallbackQuery(query.id, { text: 'Bot is offline' });
        await this.bot.sendMessage(chatId, 
          '❌ *Bot is Offline*\n\n' +
          'The bot is currently offline and not accepting requests.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

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
        case 'toggle_setting':
          await this.handleToggleSettingCallback(query, params);
          break;
        case 'change_language':
          await this.handleChangeLanguageCallback(query);
          break;
        case 'show_settings':
          await this.handleShowSettingsCallback(query);
          break;
        case 'edit_profile':
          await this.handleEditProfileCallback(query, params);
          break;
        case 'show_profile':
          await this.handleShowProfileCallback(query);
          break;
        case 'create_ticket':
          await this.handleCreateTicketCallback(query);
          break;
        case 'list_tickets':
          await this.handleListTicketsCallback(query);
          break;
        case 'close_ticket':
          await this.handleCloseTicketCallback(query, params);
          break;
        default:
          // Handle callback data without colon separator
          if (data.startsWith('close_ticket_')) {
            const ticketId = data.replace('close_ticket_', '');
            await this.handleCloseTicketCallback(query, [ticketId]);
          } else if (data.startsWith('license_info_')) {
            const licenseKey = data.replace('license_info_', '');
            await this.handleLicenseInfoCallback(query, licenseKey);
          } else if (data.startsWith('license_analytics_')) {
            const licenseKey = data.replace('license_analytics_', '');
            await this.handleLicenseAnalyticsCallback(query, licenseKey);
          } else if (data.startsWith('extend_license_')) {
            const licenseKey = data.replace('extend_license_', '');
            await this.handleExtendLicenseCallback(query, licenseKey);
          } else if (data.startsWith('set_language:')) {
            const language = data.replace('set_language:', '');
            await this.handleSetLanguageCallback(query, language);
          } else {
            await this.bot.answerCallbackQuery(query.id, { text: 'Unknown action' });
          }
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
      await this.bot.answerCallbackQuery(query.id, { text: 'Loading settings...' });
      
      const userId = query.from.id;
      
      // Get user settings
      const settings = await this.dbManager.getUserSettings(userId);
      
      const notificationsStatus = settings.notifications_enabled ? 'Enabled' : 'Disabled';
      const analyticsStatus = settings.analytics_enabled ? 'Enabled' : 'Disabled';
      const languageMap = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German'
      };
      const languageName = languageMap[settings.language] || settings.language || 'English';

      const settingsMessage = `⚙️ *Bot Settings*\n\n` +
        `*Current Settings:*\n` +
        `🔔 Notifications: ${notificationsStatus}\n` +
        `📊 Analytics: ${analyticsStatus}\n` +
        `🌐 Language: ${languageName}\n\n` +
        `*Tap buttons below to change settings:*`;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { 
                text: settings.notifications_enabled ? '🔔 Notifications: ON' : '🔕 Notifications: OFF',
                callback_data: `toggle_setting:notifications:${settings.notifications_enabled ? '0' : '1'}`
              }
            ],
            [
              { 
                text: settings.analytics_enabled ? '📊 Analytics: ON' : '📊 Analytics: OFF',
                callback_data: `toggle_setting:analytics:${settings.analytics_enabled ? '0' : '1'}`
              }
            ],
            [
              { text: '🌐 Language', callback_data: 'change_language' }
            ],
            [
              { text: '🔄 Refresh', callback_data: 'show_settings' }
            ]
          ]
        }
      };
      
      await this.bot.sendMessage(query.message.chat.id, settingsMessage, {
        parse_mode: 'Markdown',
        ...keyboard
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
          // Try to get app first, or use appName directly as appId
          let appId = appName;
          try {
            const app = await this.licenseClient.getAppByName(appName);
            if (app && app.id) {
              appId = app.id;
            }
          } catch (appError) {
            // If app lookup fails, use appName as appId directly
            this.logger.warn('Could not fetch app info, using appName as appId:', appError.message);
          }
          
          // Try to fetch licenses
          try {
            const licensesData = await this.licenseClient.getAppLicenses(appId);
            apiLicenses = licensesData?.licenses || licensesData || [];
          } catch (licenseError) {
            this.logger.error('Error fetching licenses from API:', licenseError);
            // Continue with local stats if API fails
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
          // Try to get app first, or use appName directly as appId
          let appId = appName;
          try {
            const app = await this.licenseClient.getAppByName(appName);
            if (app && app.id) {
              appId = app.id;
            }
          } catch (appError) {
            // If app lookup fails, use appName as appId directly
            this.logger.warn('Could not fetch app info, using appName as appId:', appError.message);
          }
          
          // Try to fetch licenses
          try {
            const licensesData = await this.licenseClient.getAppLicenses(appId);
            apiLicenses = licensesData?.licenses || licensesData || [];
          } catch (licenseError) {
            this.logger.error('Error fetching licenses from API:', licenseError);
            // Continue with local stats if API fails
          }
        } catch (apiError) {
          this.logger.error('Error fetching licenses from API:', apiError);
          // Continue with local stats if API fails
        }
      }
      
      const totalLicenses = apiLicenses.length > 0 ? apiLicenses.length : botStats.totalLicenses;
      const activeLicenses = apiLicenses.filter(l => l.status?.toLowerCase() === 'active').length;
      
      // Get actual validation count (not all commands)
      const userId = query.from.id;
      const userValidations = await this.dbManager.getValidationCount(userId);
      
      const analyticsMessage = `📊 *Analytics & Statistics*\n\n` +
        `*Overall Statistics:*\n` +
        `👥 Total Users: ${botStats.totalUsers}\n` +
        `📋 Total Licenses: ${totalLicenses}\n` +
        `✅ Active Licenses: ${activeLicenses}\n` +
        `⚡ Total Commands: ${botStats.totalCommands}\n\n` +
        `*Your Statistics:*\n` +
        `📋 Your Licenses: ${totalLicenses}\n` +
        `✅ Validations: ${userValidations}\n\n` +
        `Use /analytics for detailed analytics.`;
      
      await this.bot.sendMessage(query.message.chat.id, analyticsMessage, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      this.logger.error('Error showing analytics:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error showing analytics' });
    }
  }

  async handleCreateTicketCallback(query) {
    try {
      await this.bot.answerCallbackQuery(query.id, { text: 'Creating ticket...' });
      await this.bot.sendMessage(query.message.chat.id, 
        '🎫 *Create Support Ticket*\n\n' +
        'Please use the following format:\n' +
        '`/ticket <subject> <description>`\n\n' +
        'Example:\n' +
        '`/ticket "Login Issue" "Cannot login to dashboard"`\n\n' +
        'Note: Use quotes for multi-word subject or description.',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      this.logger.error('Error handling create ticket callback:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error' });
    }
  }

  async handleListTicketsCallback(query) {
    try {
      await this.bot.answerCallbackQuery(query.id, { text: 'Loading tickets...' });
      
      // Delegate to tickets command
      const ticketsCommand = require('../commands/tickets');
      const mockMsg = {
        chat: { id: query.message.chat.id },
        from: query.from,
        text: '/tickets'
      };
      await ticketsCommand.execute(mockMsg, this.bot, this.licenseClient, this.dbManager);
    } catch (error) {
      this.logger.error('Error handling list tickets callback:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error loading tickets' });
    }
  }

  async handleCloseTicketCallback(query, params) {
    try {
      const ticketId = params && params.length > 0 ? params[0] : null;
      
      if (!ticketId) {
        await this.bot.answerCallbackQuery(query.id, { text: 'Ticket ID required' });
        return;
      }

      await this.bot.answerCallbackQuery(query.id, { text: 'Closing ticket...' });
      
      // Check admin permissions
      const adminUsers = process.env.ADMIN_USERS ? process.env.ADMIN_USERS.split(',').map(id => id.trim()) : [];
      const botOwnerId = process.env.BOT_OWNER_ID;
      const userId = query.from.id;
      
      if (!adminUsers.includes(userId.toString()) && userId.toString() !== botOwnerId) {
        await this.bot.sendMessage(query.message.chat.id, 
          '❌ *Access Denied*\n\n' +
          'This action is restricted to administrators only.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Delegate to close command
      const closeCommand = require('../commands/close');
      const mockMsg = {
        chat: { id: query.message.chat.id },
        from: query.from,
        text: `/close ${ticketId}`
      };
      await closeCommand.execute(mockMsg, this.bot, this.licenseClient, this.dbManager);
    } catch (error) {
      this.logger.error('Error handling close ticket callback:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error closing ticket' });
    }
  }

  async handleCreateCallback(query, params) {
    try {
      await this.bot.answerCallbackQuery(query.id, { text: 'Create license' });
      
      await this.bot.sendMessage(query.message.chat.id,
        `➕ *Create License*\n\n` +
        `To create a new license, use:\n` +
        `\`/create <user-id> <features> <expires>\`\n\n` +
        `Example: \`/create tester FREE 2025-12-31\`\n` +
        `Example: \`/create user@example.com PRO 30\`\n` +
        `Example: \`/create John Doe BUSINESS 365\`\n\n` +
        `*user-id:* Name or email address (can be multiple words)\n` +
        `*features:* FREE, PRO, BUSINESS, ENTERPRISE\n` +
        `*expires:* Date (YYYY-MM-DD) or days from now`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      this.logger.error('Error handling create callback:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error' });
    }
  }

  async handleListCallback(query, params) {
    try {
      await this.bot.answerCallbackQuery(query.id, { text: 'Loading licenses...' });
      
      // Delegate to list command
      const listCommand = require('../commands/list');
      const mockMsg = {
        chat: { id: query.message.chat.id },
        from: query.from,
        text: '/list'
      };
      await listCommand.execute(mockMsg, this.bot, this.licenseClient, this.dbManager);
    } catch (error) {
      this.logger.error('Error handling list callback:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error loading licenses' });
    }
  }

  async handleLicenseInfoCallback(query, licenseKey) {
    try {
      await this.bot.answerCallbackQuery(query.id, { text: 'Loading license info...' });
      
      // Delegate to info command
      const infoCommand = require('../commands/info');
      const mockMsg = {
        chat: { id: query.message.chat.id },
        from: query.from,
        text: `/info ${licenseKey}`
      };
      await infoCommand.execute(mockMsg, this.bot, this.licenseClient, this.dbManager);
    } catch (error) {
      this.logger.error('Error handling license info callback:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error loading license info' });
    }
  }

  async handleLicenseAnalyticsCallback(query, licenseKey) {
    try {
      await this.bot.answerCallbackQuery(query.id, { text: 'Loading license analytics...' });
      
      // Try to get license analytics from API
      try {
        const analytics = await this.licenseClient.getLicenseAnalytics(licenseKey, '30d');
        
        const message = `📊 *License Analytics*\n\n` +
          `*License Key:* \`${licenseKey}\`\n\n` +
          `*Usage Statistics:*\n` +
          `📈 Total Validations: ${analytics?.totalValidations || 0}\n` +
          `📅 Last Validated: ${analytics?.lastValidated ? new Date(analytics.lastValidated).toLocaleDateString() : 'Never'}\n` +
          `🌍 Locations: ${analytics?.locations?.length || 0}\n` +
          `📊 Status: ${analytics?.status || 'Active'}\n\n` +
          `Use /info ${licenseKey} for more details.`;
        
        await this.bot.sendMessage(query.message.chat.id, message, {
          parse_mode: 'Markdown'
        });
      } catch (error) {
        // If analytics not available, show basic info
        await this.bot.sendMessage(query.message.chat.id,
          `📊 *License Analytics*\n\n` +
          `*License Key:* \`${licenseKey}\`\n\n` +
          `Analytics data is not available for this license.\n` +
          `Use /info ${licenseKey} to view license details.`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (error) {
      this.logger.error('Error handling license analytics callback:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error loading analytics' });
    }
  }

  async handleExtendLicenseCallback(query, licenseKey) {
    try {
      await this.bot.answerCallbackQuery(query.id, { text: 'Extend license' });
      
      await this.bot.sendMessage(query.message.chat.id,
        `🔄 *Extend License*\n\n` +
        `To extend license \`${licenseKey}\`, use:\n` +
        `\`/extend ${licenseKey} <days>\`\n\n` +
        `Example: \`/extend ${licenseKey} 30\`\n\n` +
        `This will extend the license expiration by the specified number of days.`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      this.logger.error('Error handling extend license callback:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error' });
    }
  }

  async handleCreateCallback(query, params) {
    try {
      await this.bot.answerCallbackQuery(query.id, { text: 'Create license' });
      
      await this.bot.sendMessage(query.message.chat.id,
        `➕ *Create License*\n\n` +
        `To create a new license, use:\n` +
        `\`/create <user-id> <features> <expires>\`\n\n` +
        `Example: \`/create tester FREE 2025-12-31\`\n` +
        `Example: \`/create user@example.com PRO 30\`\n` +
        `Example: \`/create John Doe BUSINESS 365\`\n\n` +
        `*user-id:* Name or email address (can be multiple words)\n` +
        `*features:* FREE, PRO, BUSINESS, ENTERPRISE\n` +
        `*expires:* Date (YYYY-MM-DD) or days from now`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      this.logger.error('Error handling create callback:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error' });
    }
  }

  async handleToggleSettingCallback(query, params) {
    try {
      const [setting, value] = params;
      const userId = query.from.id;
      
      const settings = {};
      if (setting === 'notifications') {
        settings.notifications_enabled = value === '1';
      } else if (setting === 'analytics') {
        settings.analytics_enabled = value === '1';
      }
      
      await this.dbManager.updateUserSettings(userId, settings);
      
      await this.bot.answerCallbackQuery(query.id, { 
        text: `${setting === 'notifications' ? 'Notifications' : 'Analytics'} ${value === '1' ? 'enabled' : 'disabled'}` 
      });
      
      // Refresh settings display
      const settingsCommand = require('../commands/settings');
      const mockMsg = {
        chat: { id: query.message.chat.id },
        from: query.from,
        text: '/settings'
      };
      await settingsCommand.execute(mockMsg, this.bot, this.licenseClient, this.dbManager);
      
    } catch (error) {
      this.logger.error('Error handling toggle setting callback:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error updating setting' });
    }
  }

  async handleChangeLanguageCallback(query) {
    try {
      await this.bot.answerCallbackQuery(query.id, { text: 'Language selection' });
      
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🇺🇸 English', callback_data: 'set_language:en' },
              { text: '🇪🇸 Spanish', callback_data: 'set_language:es' }
            ],
            [
              { text: '🇫🇷 French', callback_data: 'set_language:fr' },
              { text: '🇩🇪 German', callback_data: 'set_language:de' }
            ]
          ]
        }
      };
      
      await this.bot.sendMessage(query.message.chat.id,
        `🌐 *Select Language*\n\n` +
        `Choose your preferred language:`,
        { parse_mode: 'Markdown', ...keyboard }
      );
    } catch (error) {
      this.logger.error('Error handling change language callback:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error' });
    }
  }

  async handleSetLanguageCallback(query, language) {
    try {
      const userId = query.from.id;
      const languageMap = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German'
      };
      
      await this.dbManager.updateUserSettings(userId, { language });
      
      await this.bot.answerCallbackQuery(query.id, { 
        text: `Language set to ${languageMap[language] || language}` 
      });
      
      // Refresh settings display
      const settingsCommand = require('../commands/settings');
      const mockMsg = {
        chat: { id: query.message.chat.id },
        from: query.from,
        text: '/settings'
      };
      await settingsCommand.execute(mockMsg, this.bot, this.licenseClient, this.dbManager);
      
    } catch (error) {
      this.logger.error('Error handling set language callback:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error setting language' });
    }
  }

  async handleEditProfileCallback(query, params) {
    try {
      const [field] = params;
      const userId = query.from.id;
      
      if (field === 'username') {
        await this.bot.answerCallbackQuery(query.id, { text: 'Edit username' });
        await this.bot.sendMessage(query.message.chat.id,
          `✏️ *Edit Username*\n\n` +
          `To update your username, send me a message with:\n` +
          `\`/updateprofile username <new_username>\`\n\n` +
          `Example: \`/updateprofile username newusername\`\n\n` +
          `Or simply update your Telegram username and use /profile to refresh.`,
          { parse_mode: 'Markdown' }
        );
      } else if (field === 'name') {
        await this.bot.answerCallbackQuery(query.id, { text: 'Edit name' });
        await this.bot.sendMessage(query.message.chat.id,
          `✏️ *Edit Name*\n\n` +
          `To update your name, send me a message with:\n` +
          `\`/updateprofile name <first_name> [last_name]\`\n\n` +
          `Example: \`/updateprofile name John\`\n` +
          `Example: \`/updateprofile name John Doe\`\n\n` +
          `Or simply update your Telegram name and use /profile to refresh.`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (error) {
      this.logger.error('Error handling edit profile callback:', error);
      await this.bot.answerCallbackQuery(query.id, { text: 'Error' });
    }
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
