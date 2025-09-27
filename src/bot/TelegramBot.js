const { Telegraf } = require('telegraf');
const LicenseChainClient = require('../client/LicenseChainClient');
const CommandHandler = require('../handlers/CommandHandler');
const EventHandler = require('../handlers/EventHandler');
const Logger = require('../utils/Logger');

class TelegramBot {
    constructor(config) {
        this.config = config;
        this.bot = new Telegraf(config.telegramToken);
        this.licenseClient = new LicenseChainClient(config.licenseChain);
        this.commandHandler = new CommandHandler(this.licenseClient);
        this.eventHandler = new EventHandler(this.licenseClient);
        this.logger = new Logger('TelegramBot');
        
        this.setupBot();
    }

    setupBot() {
        // Error handling
        this.bot.catch((err, ctx) => {
            this.logger.error('Bot error:', err);
            ctx.reply('Sorry, an error occurred. Please try again later.');
        });

        // Start command
        this.bot.start((ctx) => this.commandHandler.handleStart(ctx));
        
        // Help command
        this.bot.help((ctx) => this.commandHandler.handleHelp(ctx));
        
        // License validation command
        this.bot.command('validate', (ctx) => this.commandHandler.handleValidate(ctx));
        
        // License creation command
        this.bot.command('create', (ctx) => this.commandHandler.handleCreate(ctx));
        
        // User info command
        this.bot.command('info', (ctx) => this.commandHandler.handleInfo(ctx));
        
        // Admin commands
        this.bot.command('admin', (ctx) => this.commandHandler.handleAdmin(ctx));
        
        // License list command
        this.bot.command('list', (ctx) => this.commandHandler.handleList(ctx));
        
        // License revoke command
        this.bot.command('revoke', (ctx) => this.commandHandler.handleRevoke(ctx));
        
        // License extend command
        this.bot.command('extend', (ctx) => this.commandHandler.handleExtend(ctx));
        
        // Statistics command
        this.bot.command('stats', (ctx) => this.commandHandler.handleStats(ctx));
        
        // Settings command
        this.bot.command('settings', (ctx) => this.commandHandler.handleSettings(ctx));
        
        // Callback query handling
        this.bot.on('callback_query', (ctx) => this.eventHandler.handleCallbackQuery(ctx));
        
        // Text message handling
        this.bot.on('text', (ctx) => this.eventHandler.handleText(ctx));
        
        // Photo handling
        this.bot.on('photo', (ctx) => this.eventHandler.handlePhoto(ctx));
        
        // Document handling
        this.bot.on('document', (ctx) => this.eventHandler.handleDocument(ctx));
        
        this.logger.info('Telegram bot setup completed');
    }

    async start() {
        try {
            await this.bot.launch();
            this.logger.info('Telegram bot started successfully');
            
            // Enable graceful stop
            process.once('SIGINT', () => this.stop('SIGINT'));
            process.once('SIGTERM', () => this.stop('SIGTERM'));
        } catch (error) {
            this.logger.error('Failed to start bot:', error);
            throw error;
        }
    }

    async stop(signal) {
        this.logger.info(`Stopping bot (${signal})...`);
        this.bot.stop(signal);
        this.logger.info('Bot stopped');
    }

    getBot() {
        return this.bot;
    }
}

module.exports = TelegramBot;
