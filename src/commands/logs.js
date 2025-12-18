/**
 * Logs Command - Get bot logs (Admin only)
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'logs',
  description: 'Get bot logs (Admin only)',
  
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

    const lines = args.length > 0 ? parseInt(args[0]) : 20;
    const maxLines = 100;

    if (isNaN(lines) || lines < 1 || lines > maxLines) {
      await bot.sendMessage(chatId, 
        `❌ *Invalid Lines*\n\n` +
        `Please specify a number between 1 and ${maxLines}.\n` +
        `Usage: \`/logs [lines]\`\n` +
        `Example: \`/logs 50\``,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Fetching logs...');

      // Try to read log file if it exists
      const logPath = path.join(__dirname, '../../logs/bot.log');
      let logContent = '';

      if (fs.existsSync(logPath)) {
        const allLogs = fs.readFileSync(logPath, 'utf8');
        const logLines = allLogs.split('\n').filter(line => line.trim());
        const recentLogs = logLines.slice(-lines);
        logContent = recentLogs.join('\n');
      } else {
        // If no log file, show recent console output info
        logContent = `No log file found at: ${logPath}\n\n` +
          `Recent activity:\n` +
          `- Bot is running\n` +
          `- Last command: ${new Date().toLocaleString()}\n` +
          `- Check console output for detailed logs`;
      }

      // Telegram message limit is 4096 characters
      if (logContent.length > 4000) {
        logContent = logContent.substring(logContent.length - 4000);
        logContent = '... (truncated)\n' + logContent;
      }

      const message = `📝 *Bot Logs*\n\n` +
        `*Last ${lines} lines:*\n\n` +
        `\`\`\`\n${logContent}\n\`\`\``;

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('Error getting logs:', error);
      await bot.sendMessage(chatId, 
        `❌ *Error*\n\n` +
        `An error occurred while fetching logs:\n` +
        `\`${error.message}\``,
        { parse_mode: 'Markdown' }
      );
    }
  }
};
