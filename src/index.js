/**
 * LicenseChain Telegram Bot
 * Advanced Telegram integration for license management
 */

// Load environment variables first
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const winston = require('winston');
const cron = require('node-cron');
const express = require('express');
const path = require('path');

// Import bot modules
const LicenseChainClient = require('./client/LicenseChainClient');
const CommandHandler = require('./handlers/CommandHandler');
const MessageHandler = require('./handlers/MessageHandler');
const DatabaseManager = require('./database/DatabaseManager');
const Scheduler = require('./utils/Scheduler');
const Translator = require('./utils/Translator');

// Webhook vs polling: USE_WEBHOOK=true and TELEGRAM_WEBHOOK_URL set => webhook mode
const USE_WEBHOOK = /^(true|1|yes)$/i.test(process.env.USE_WEBHOOK || '') && !!process.env.TELEGRAM_WEBHOOK_URL;

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Create Telegram bot (polling only when not using webhook)
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: !USE_WEBHOOK });

// Initialize bot components
const licenseClient = new LicenseChainClient({
  apiKey: process.env.LICENSE_CHAIN_API_KEY,
  baseUrl: process.env.LICENSE_CHAIN_API_URL || 'https://api.licensechain.app'
});

const dbManager = new DatabaseManager();
const translator = new Translator(dbManager);
const commandHandler = new CommandHandler(bot, licenseClient, dbManager, translator);
const messageHandler = new MessageHandler(bot, licenseClient, dbManager, translator);
const scheduler = new Scheduler(bot, licenseClient, dbManager);

// Bot events (polling_error only relevant when polling)
if (!USE_WEBHOOK) {
  bot.on('polling_error', (error) => {
    logger.error('Telegram polling error:', error);
  });
}

bot.on('error', (error) => {
  logger.error('Telegram bot error:', error);
});

// Initialize bot
async function initializeBot() {
  try {
    if (!process.env.TELEGRAM_TOKEN) {
      logger.error('TELEGRAM_TOKEN is required. Set it in .env or environment.');
      process.exit(1);
    }
    if (!process.env.LICENSE_CHAIN_API_KEY) {
      logger.warn('LICENSE_CHAIN_API_KEY is not set; LicenseChain API features (validate, create, licenses) may not work.');
    }

    logger.info('Initializing LicenseChain Telegram Bot...');

    // Initialize database
    await dbManager.initialize();
    
    // Load commands and handlers
    await commandHandler.loadCommands();
    await messageHandler.loadHandlers();
    
    // Start scheduled tasks
    scheduler.startScheduledTasks();
    
    // Get bot info
    const botInfo = await bot.getMe();
    logger.info(`Telegram bot @${botInfo.username} is ready!`);
    
    // Set bot commands
    await bot.setMyCommands([
      { command: 'start', description: 'Start the bot and get help' },
      { command: 'help', description: 'Show available commands' },
      { command: 'license', description: 'Manage your licenses' },
      { command: 'validate', description: 'Validate a license key' },
      { command: 'analytics', description: 'View analytics and statistics' },
      { command: 'profile', description: 'Manage your profile' },
      { command: 'settings', description: 'Bot settings and preferences' }
    ]);
    
    logger.info('LicenseChain Telegram Bot is ready!');
  } catch (error) {
    logger.error('Failed to initialize bot:', error);
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', error => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Health check server
const app = express();
const PORT = process.env.PORT || 3005;

// JSON body parser (required for webhook POST)
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    bot: 'online',
    mode: USE_WEBHOOK ? 'webhook' : 'polling',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.LICENSECHAIN_APP_VERSION || '1.0.0'
  });
});

// Webhook endpoint (only used when USE_WEBHOOK=true)
if (USE_WEBHOOK) {
  app.post('/webhook', (req, res) => {
    const secretToken = process.env.WEBHOOK_SECRET;
    if (secretToken && req.headers['x-telegram-bot-api-secret-token'] !== secretToken) {
      res.status(403).send('Forbidden');
      return;
    }
    const update = req.body;
    if (!update || typeof update !== 'object') {
      res.status(400).send('Bad Request');
      return;
    }
    // Respond 200 immediately so Telegram does not retry; process update asynchronously
    res.sendStatus(200);
    setImmediate(() => {
      try {
        bot.processUpdate(update);
      } catch (err) {
        logger.error('Webhook processUpdate error:', err);
      }
    });
  });
}

app.get('/stats', async (req, res) => {
  try {
    const botInfo = await bot.getMe();
    const stats = await dbManager.getBotStats();
    
    res.json({
      bot: {
        username: botInfo.username,
        first_name: botInfo.first_name,
        id: botInfo.id
      },
      users: stats.totalUsers,
      licenses: stats.totalLicenses,
      commands: stats.totalCommands,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

app.listen(PORT, async () => {
  logger.info(`Health check server running on port ${PORT}`);
  try {
    if (USE_WEBHOOK) {
      const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
      const setWebHookOptions = process.env.WEBHOOK_SECRET ? { secret_token: process.env.WEBHOOK_SECRET } : {};
      await bot.setWebHook(webhookUrl, setWebHookOptions);
      logger.info(`Webhook set: ${webhookUrl}`);
    }
    await initializeBot();
  } catch (err) {
    logger.error('Startup failed:', err);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down bot...');
  scheduler.stopScheduledTasks();
  await dbManager.close();
  if (USE_WEBHOOK) {
    try {
      await bot.deleteWebHook();
      logger.info('Webhook removed');
    } catch (err) {
      logger.warn('deleteWebHook failed:', err);
    }
  } else {
    bot.stopPolling();
  }
  process.exit(0);
});

module.exports = bot;