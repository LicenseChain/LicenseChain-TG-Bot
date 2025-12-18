/**
 * Status Command - Get bot status (Admin only)
 */

module.exports = {
  name: 'status',
  description: 'Get bot status (Admin only)',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

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

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Checking bot status...');

      // Get bot status from database
      const botStatus = await dbManager.getBotStatus();
      const statusEmoji = botStatus === 'online' ? '✅' : 
                          botStatus === 'offline' ? '❌' : 
                          botStatus === 'maintenance' ? '⚠️' : '⚪';

      // Get bot statistics
      const stats = await dbManager.getBotStats();
      
      // Check API health
      let apiStatus = '❌ Unknown';
      try {
        await licenseClient.healthCheck();
        apiStatus = '✅ Online';
      } catch (error) {
        apiStatus = `❌ Error: ${error.message.substring(0, 30)}...`;
      }

      // Get system info
      const uptime = process.uptime();
      const uptimeHours = Math.floor(uptime / 3600);
      const uptimeMinutes = Math.floor((uptime % 3600) / 60);
      const memoryUsage = process.memoryUsage();
      const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

      const message = `📊 *Bot Status*\n\n` +
        `*Bot Status:* ${statusEmoji} ${botStatus.toUpperCase()}\n` +
        `*API Status:* ${apiStatus}\n` +
        `*Uptime:* ${uptimeHours}h ${uptimeMinutes}m\n` +
        `*Memory Usage:* ${memoryMB} MB\n\n` +
        `*Statistics:*\n` +
        `👥 Total Users: ${stats.totalUsers}\n` +
        `📋 Total Licenses: ${stats.totalLicenses}\n` +
        `⚡ Total Commands: ${stats.totalCommands}\n\n` +
        `*Environment:*\n` +
        `App Name: ${process.env.LICENSECHAIN_APP_NAME || 'Not set'}\n` +
        `Node Version: ${process.version}\n` +
        `Port: ${process.env.PORT || 3005}`;

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('Error getting bot status:', error);
      await bot.sendMessage(chatId, 
        `❌ *Error*\n\n` +
        `An error occurred while checking bot status:\n` +
        `\`${error.message}\``,
        { parse_mode: 'Markdown' }
      );
    }
  }
};
