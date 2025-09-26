/**
 * Command Handler for Telegram Bot
 */

const fs = require('fs');
const path = require('path');

class CommandHandler {
  constructor(bot, licenseClient, dbManager) {
    this.bot = bot;
    this.licenseClient = licenseClient;
    this.dbManager = dbManager;
    this.commands = new Map();
  }

  async loadCommands() {
    const commandsPath = path.join(__dirname, '../commands');
    
    if (!fs.existsSync(commandsPath)) {
      fs.mkdirSync(commandsPath, { recursive: true });
      return;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);

      if (command.name && command.execute) {
        this.commands.set(command.name, command);
        console.log(`Loaded command: ${command.name}`);
      } else {
        console.log(`[WARNING] The command at ${filePath} is missing required properties.`);
      }
    }

    // Set up command handlers
    this.setupCommandHandlers();
  }

  setupCommandHandlers() {
    this.bot.on('message', async (msg) => {
      if (msg.text && msg.text.startsWith('/')) {
        const commandName = msg.text.split(' ')[0].substring(1);
        const command = this.commands.get(commandName);
        
        if (command) {
          try {
            await command.execute(msg, this.bot, this.licenseClient, this.dbManager);
          } catch (error) {
            console.error(`Error executing command ${commandName}:`, error);
            await this.bot.sendMessage(msg.chat.id, '❌ An error occurred while processing your command.');
          }
        }
      }
    });
  }

  // Utility methods for creating messages
  createSuccessMessage(title, description) {
    return `✅ *${title}*\n\n${description}`;
  }

  createErrorMessage(title, description) {
    return `❌ *${title}*\n\n${description}`;
  }

  createInfoMessage(title, description) {
    return `ℹ️ *${title}*\n\n${description}`;
  }

  createWarningMessage(title, description) {
    return `⚠️ *${title}*\n\n${description}`;
  }

  // Create inline keyboard
  createInlineKeyboard(buttons) {
    return {
      reply_markup: {
        inline_keyboard: buttons
      }
    };
  }

  // Create reply keyboard
  createReplyKeyboard(buttons, oneTime = true) {
    return {
      reply_markup: {
        keyboard: buttons,
        one_time_keyboard: oneTime,
        resize_keyboard: true
      }
    };
  }

  // Create pagination keyboard
  createPaginationKeyboard(currentPage, totalPages, callbackPrefix) {
    const buttons = [];
    
    if (currentPage > 1) {
      buttons.push([
        { text: '⏮️ First', callback_data: `${callbackPrefix}_first` },
        { text: '◀️ Previous', callback_data: `${callbackPrefix}_prev` }
      ]);
    }
    
    if (currentPage < totalPages) {
      buttons.push([
        { text: 'Next ▶️', callback_data: `${callbackPrefix}_next` },
        { text: 'Last ⏭️', callback_data: `${callbackPrefix}_last` }
      ]);
    }
    
    return this.createInlineKeyboard(buttons);
  }

  // Format license information
  formatLicenseInfo(license) {
    const status = license.status === 'active' ? '✅ Active' : 
                  license.status === 'expired' ? '❌ Expired' : '⚠️ Suspended';
    
    const expires = license.expiresAt ? 
      new Date(license.expiresAt).toLocaleDateString() : 'Never';
    
    return `*${license.applicationName || 'Unknown App'}*\n` +
           `Key: \`${license.key}\`\n` +
           `Status: ${status}\n` +
           `Plan: ${license.plan}\n` +
           `Expires: ${expires}\n` +
           `Price: $${license.price}`;
  }

  // Format analytics data
  formatAnalytics(analytics) {
    return `*Analytics Overview*\n\n` +
           `💰 Total Revenue: $${analytics.revenue?.total || 0}\n` +
           `🔑 Active Licenses: ${analytics.licenses?.active || 0}\n` +
           `👥 Total Users: ${analytics.users?.total || 0}\n` +
           `📈 Conversion Rate: ${analytics.conversions?.rate || 0}%\n` +
           `📊 Growth Rate: ${analytics.growth?.rate || 0}%`;
  }

  // Format usage statistics
  formatUsageStats(stats) {
    return `*Usage Statistics*\n\n` +
           `🔢 Total Validations: ${stats.totalValidations || 0}\n` +
           `🔑 Active Licenses: ${stats.activeLicenses || 0}\n` +
           `⭐ Most Used: ${stats.mostUsedLicense || 'N/A'}\n` +
           `📊 Daily Average: ${stats.averageDaily || 0}\n` +
           `📈 Trend: ${stats.trend || 'Stable'}`;
  }

  // Send message with error handling
  async sendMessage(chatId, text, options = {}) {
    try {
      return await this.bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        ...options
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Fallback without markdown if parsing fails
      try {
        return await this.bot.sendMessage(chatId, text.replace(/[*_`]/g, ''), options);
      } catch (fallbackError) {
        console.error('Fallback message also failed:', fallbackError);
      }
    }
  }

  // Edit message with error handling
  async editMessage(chatId, messageId, text, options = {}) {
    try {
      return await this.bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        ...options
      });
    } catch (error) {
      console.error('Error editing message:', error);
      // Fallback without markdown if parsing fails
      try {
        return await this.bot.editMessageText(text.replace(/[*_`]/g, ''), {
          chat_id: chatId,
          message_id: messageId,
          ...options
        });
      } catch (fallbackError) {
        console.error('Fallback edit also failed:', fallbackError);
      }
    }
  }
}

module.exports = CommandHandler;
