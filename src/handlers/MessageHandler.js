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
      await this.bot.answerCallbackQuery(query.id, { text: 'No license key provided' });
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
