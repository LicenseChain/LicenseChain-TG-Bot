/**
 * LicenseChain Telegram Bot
 * Advanced Telegram integration for license management
 */

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

// Create Telegram bot
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// Initialize bot components
const licenseClient = new LicenseChainClient({
  apiKey: process.env.LICENSE_CHAIN_API_KEY,
  baseUrl: process.env.LICENSE_CHAIN_API_URL || 'https://api.licensechain.app'
});

const dbManager = new DatabaseManager();
const commandHandler = new CommandHandler(bot, licenseClient, dbManager);
const messageHandler = new MessageHandler(bot, licenseClient, dbManager);
const scheduler = new Scheduler(bot, licenseClient, dbManager);

// Bot ready event
bot.on('polling_error', (error) => {
  logger.error('Telegram polling error:', error);
});

bot.on('error', (error) => {
  logger.error('Telegram bot error:', error);
});

// Initialize bot
async function initializeBot() {
  try {
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

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    bot: 'online',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

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

app.listen(PORT, () => {
  logger.info(`Health check server running on port ${PORT}`);
});

// Initialize bot
initializeBot();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down bot...');
  
  // Stop scheduled tasks
  scheduler.stopScheduledTasks();
  
  // Close database connections
  await dbManager.close();
  
  // Stop bot polling
  bot.stopPolling();
  
  process.exit(0);
});

module.exports = bot;