const Logger = require('../utils/Logger');

class AdminCommand {
    constructor(licenseClient) {
        this.licenseClient = licenseClient;
        this.logger = new Logger('AdminCommand');
    }

    async handle(ctx) {
        try {
            const userId = ctx.from.id;
            const username = ctx.from.username || 'Unknown';
            
            this.logger.info(`Admin command received from user ${userId} (${username})`);
            
            // Check if user is admin
            if (!await this.isAdmin(userId)) {
                await ctx.reply('❌ You are not authorized to use admin commands.');
                return;
            }
            
            // Create admin keyboard
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '📊 Statistics', callback_data: 'admin:stats' },
                        { text: '👥 Users', callback_data: 'admin:users' }
                    ],
                    [
                        { text: '📋 Licenses', callback_data: 'admin:licenses' },
                        { text: '⚙️ Settings', callback_data: 'admin:settings' }
                    ],
                    [
                        { text: '🔧 System', callback_data: 'admin:system' },
                        { text: '📝 Logs', callback_data: 'admin:logs' }
                    ]
                ]
            };
            
            await ctx.reply('🔧 Admin Panel', { reply_markup: keyboard });
        } catch (error) {
            this.logger.error('Error handling admin command:', error);
            await ctx.reply('Sorry, there was an error processing your admin request.');
        }
    }

    async isAdmin(userId) {
        try {
            // Check if user is in admin list
            const adminUsers = process.env.ADMIN_USERS ? process.env.ADMIN_USERS.split(',') : [];
            return adminUsers.includes(userId.toString());
        } catch (error) {
            this.logger.error('Error checking admin status:', error);
            return false;
        }
    }

    async handleStats(ctx) {
        try {
            const stats = await this.licenseClient.getStats();
            
            let message = '📊 System Statistics\n\n';
            message += `📋 Total Licenses: ${stats.totalLicenses || 0}\n`;
            message += `✅ Active Licenses: ${stats.activeLicenses || 0}\n`;
            message += `❌ Expired Licenses: ${stats.expiredLicenses || 0}\n`;
            message += `👥 Total Users: ${stats.totalUsers || 0}\n`;
            message += `💰 Revenue: $${stats.revenue || 0}\n`;
            message += `🔄 API Calls Today: ${stats.apiCallsToday || 0}\n`;
            message += `⏰ Uptime: ${stats.uptime || 'Unknown'}\n`;
            
            await ctx.reply(message);
        } catch (error) {
            this.logger.error('Error getting stats:', error);
            await ctx.reply('Sorry, there was an error retrieving statistics.');
        }
    }

    async handleUsers(ctx) {
        try {
            const users = await this.licenseClient.getUsers();
            
            let message = '👥 Users\n\n';
            
            if (users.length === 0) {
                message += 'No users found.';
            } else {
                users.slice(0, 10).forEach((user, index) => {
                    message += `${index + 1}. ${user.username || 'Unknown'} (${user.email || 'No email'})\n`;
                    message += `   ID: ${user.id}\n`;
                    message += `   Created: ${new Date(user.createdAt).toLocaleDateString()}\n\n`;
                });
                
                if (users.length > 10) {
                    message += `... and ${users.length - 10} more users`;
                }
            }
            
            await ctx.reply(message);
        } catch (error) {
            this.logger.error('Error getting users:', error);
            await ctx.reply('Sorry, there was an error retrieving users.');
        }
    }

    async handleLicenses(ctx) {
        try {
            const licenses = await this.licenseClient.getAllLicenses();
            
            let message = '📋 All Licenses\n\n';
            
            if (licenses.length === 0) {
                message += 'No licenses found.';
            } else {
                licenses.slice(0, 10).forEach((license, index) => {
                    message += `${index + 1}. ${license.licenseKey}\n`;
                    message += `   User: ${license.userId}\n`;
                    message += `   Product: ${license.productId}\n`;
                    message += `   Status: ${license.status}\n`;
                    message += `   Created: ${new Date(license.createdAt).toLocaleDateString()}\n\n`;
                });
                
                if (licenses.length > 10) {
                    message += `... and ${licenses.length - 10} more licenses`;
                }
            }
            
            await ctx.reply(message);
        } catch (error) {
            this.logger.error('Error getting licenses:', error);
            await ctx.reply('Sorry, there was an error retrieving licenses.');
        }
    }

    async handleSystem(ctx) {
        try {
            const systemInfo = {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            };
            
            let message = '🔧 System Information\n\n';
            message += `Node.js Version: ${systemInfo.nodeVersion}\n`;
            message += `Platform: ${systemInfo.platform}\n`;
            message += `Architecture: ${systemInfo.arch}\n`;
            message += `Uptime: ${Math.floor(systemInfo.uptime / 3600)}h ${Math.floor((systemInfo.uptime % 3600) / 60)}m\n`;
            message += `Memory Usage: ${Math.round(systemInfo.memoryUsage.heapUsed / 1024 / 1024)}MB\n`;
            message += `CPU Usage: ${Math.round(systemInfo.cpuUsage.user / 1000000)}ms user, ${Math.round(systemInfo.cpuUsage.system / 1000000)}ms system\n`;
            
            await ctx.reply(message);
        } catch (error) {
            this.logger.error('Error getting system info:', error);
            await ctx.reply('Sorry, there was an error retrieving system information.');
        }
    }

    async handleLogs(ctx) {
        try {
            const Logger = require('../utils/Logger');
            const logger = new Logger('AdminCommand');
            
            const logFiles = logger.getLogFiles();
            const logSize = logger.getLogFileSize();
            
            let message = '📝 Log Information\n\n';
            message += `Log Files: ${logFiles.length}\n`;
            message += `Total Size: ${Math.round(logSize / 1024)}KB\n`;
            message += `Log Directory: ${logger.logDir}\n\n`;
            
            if (logFiles.length > 0) {
                message += 'Recent Log Files:\n';
                logFiles.slice(-5).forEach(file => {
                    const fileName = file.split('/').pop();
                    message += `• ${fileName}\n`;
                });
            }
            
            await ctx.reply(message);
        } catch (error) {
            this.logger.error('Error getting log info:', error);
            await ctx.reply('Sorry, there was an error retrieving log information.');
        }
    }
}

// Export as command object for CommandHandler
module.exports = {
    name: 'admin',
    description: 'Open admin panel (Admin only)',
    execute: async (msg, bot, licenseClient, dbManager) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const username = msg.from.username || 'Unknown';
        
        try {
            const logger = new Logger('AdminCommand');
            logger.info(`Admin command received from user ${userId} (${username})`);
            
            const adminCommand = new AdminCommand(licenseClient);
            
            // Check if user is admin
            if (!await adminCommand.isAdmin(userId)) {
                await bot.sendMessage(chatId, '❌ You are not authorized to use admin commands.');
                return;
            }
            
            // Create admin keyboard
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '📊 Statistics', callback_data: 'admin:stats' },
                        { text: '👥 Users', callback_data: 'admin:users' }
                    ],
                    [
                        { text: '📋 Licenses', callback_data: 'admin:licenses' },
                        { text: '⚙️ Settings', callback_data: 'admin:settings' }
                    ],
                    [
                        { text: '🔧 System', callback_data: 'admin:system' },
                        { text: '📝 Logs', callback_data: 'admin:logs' }
                    ]
                ]
            };
            
            await bot.sendMessage(chatId, '🔧 Admin Panel', { reply_markup: keyboard });
        } catch (error) {
            console.error('Error in admin command:', error);
            await bot.sendMessage(chatId, '❌ An error occurred. Please try again later.');
        }
    }
};

// Also export the class for backward compatibility
module.exports.AdminCommand = AdminCommand;
