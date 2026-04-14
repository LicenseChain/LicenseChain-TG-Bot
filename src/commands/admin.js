const Logger = require('../utils/Logger');
const PermissionManager = require('../utils/PermissionManager');
const Validator = require('../utils/Validator');

class AdminCommand {
    constructor(licenseClient) {
        this.licenseClient = licenseClient;
        this.logger = new Logger('AdminCommand');
        this.permissionManager = new PermissionManager();
    }

    async handle(ctx) {
        try {
            const userId = ctx.from.id;
            const username = ctx.from.username || 'Unknown';

            this.logger.info(`Admin command received from user ${userId} (${username})`);

            this.permissionManager.requirePermission(userId, 'admin');

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '📊 Statistics', callback_data: 'admin:stats' },
                        { text: '👥 Users', callback_data: 'admin:users' }
                    ],
                    [
                        { text: '📋 Licenses', callback_data: 'admin:licenses' },
                        { text: '📦 Products', callback_data: 'admin:products' }
                    ],
                    [
                        { text: '🔗 Webhooks', callback_data: 'admin:webhooks' },
                        { text: '🏥 Health', callback_data: 'admin:health' }
                    ],
                    [
                        { text: '🔧 System', callback_data: 'admin:system' },
                        { text: '📝 Logs', callback_data: 'admin:logs' }
                    ],
                    [
                        { text: '⚙️ Settings', callback_data: 'admin:settings' }
                    ]
                ]
            };

            await ctx.reply('🔧 Admin Panel', { reply_markup: keyboard });
        } catch (error) {
            this.logger.error('Error handling admin command:', error);
            if (error.message && error.message.includes('Insufficient permissions')) {
                await ctx.reply('❌ You are not authorized to use admin commands.');
            } else {
                await ctx.reply('Sorry, there was an error processing your admin request.');
            }
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
            const logUtil = new Logger('AdminCommand');

            const logFiles = logUtil.getLogFiles();
            const logSize = logUtil.getLogFileSize();

            let message = '📝 Log Information\n\n';
            message += `Log Files: ${logFiles.length}\n`;
            message += `Total Size: ${Math.round(logSize / 1024)}KB\n`;
            message += `Log Directory: ${logUtil.logDir}\n\n`;

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

    async handleProducts(ctx) {
        try {
            let apps = [];
            try {
                const allApps = await this.licenseClient.getApps();
                apps = allApps.slice(0, 20);
            } catch (apiError) {
                this.logger.warn('Could not fetch apps from API:', apiError.message);
            }

            if (apps.length === 0) {
                await ctx.reply('No products/apps found. Please check your API configuration.');
                return;
            }

            let message = '📦 Products/Apps\n\n';
            apps.forEach((app, i) => {
                message += `${i + 1}. ${Validator.sanitizeForDisplay(app.name || app.id)}\n`;
                message += `   ID: \`${Validator.sanitizeForDisplay(app.id)}\`\n`;
                message += `   Slug: ${Validator.sanitizeForDisplay(app.slug || 'N/A')}\n`;
                message += `   Created: ${app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Unknown'}\n\n`;
            });
            if (apps.length >= 20) {
                message += '... (showing first 20)';
            }
            await ctx.reply(message, { parse_mode: 'Markdown' });
        } catch (error) {
            this.logger.error('Error fetching products:', error);
            await ctx.reply('Failed to fetch products: ' + Validator.sanitizeForDisplay(error.message));
        }
    }

    async handleWebhooks(ctx) {
        try {
            let webhooks = [];
            try {
                webhooks = await this.licenseClient.getWebhooks();
            } catch (apiError) {
                this.logger.warn('Could not fetch webhooks from API:', apiError.message);
            }

            if (webhooks.length === 0) {
                await ctx.reply('No webhooks found. Webhooks may not be configured or the API endpoint may not be available.');
                return;
            }

            let message = '🔗 Webhooks\n\n';
            webhooks.forEach((wh, i) => {
                message += `${i + 1}. ${Validator.sanitizeForDisplay(wh.id || 'Unknown')}\n`;
                message += `   URL: ${wh.url ? Validator.sanitizeForDisplay(wh.url.substring(0, 50)) + '...' : 'N/A'}\n`;
                message += `   Events: ${wh.events ? wh.events.join(', ') : 'N/A'}\n`;
                message += `   Created: ${wh.created_at ? new Date(wh.created_at).toLocaleDateString() : 'Unknown'}\n\n`;
            });
            await ctx.reply(message);
        } catch (error) {
            this.logger.error('Error fetching webhooks:', error);
            await ctx.reply('Failed to fetch webhooks: ' + Validator.sanitizeForDisplay(error.message));
        }
    }

    async handleHealth(ctx) {
        try {
            let healthStatus = null;
            let apiResponseTime = null;

            try {
                const startTime = Date.now();
                healthStatus = await this.licenseClient.healthCheck();
                apiResponseTime = Date.now() - startTime;
            } catch (apiError) {
                this.logger.warn('API health check failed:', apiError.message);
                healthStatus = { status: 'unhealthy', error: apiError.message };
            }

            let message = '🏥 API Health Check\n\n';
            message += `🌐 API Status: ${Validator.sanitizeForDisplay(healthStatus?.status || 'Unknown')}\n`;
            message += `⏱️ Response Time: ${apiResponseTime != null ? apiResponseTime + 'ms' : 'N/A'}\n`;
            if (healthStatus?.version) {
                message += `📦 Version: ${Validator.sanitizeForDisplay(healthStatus.version)}\n`;
            }
            if (healthStatus?.error) {
                message += `❌ Error: ${Validator.sanitizeForDisplay(healthStatus.error)}\n`;
            }
            await ctx.reply(message);
        } catch (error) {
            this.logger.error('Error checking health:', error);
            await ctx.reply('Failed to check API health: ' + Validator.sanitizeForDisplay(error.message));
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
            adminCommand.permissionManager.requirePermission(userId, 'admin');

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '📊 Statistics', callback_data: 'admin:stats' },
                        { text: '👥 Users', callback_data: 'admin:users' }
                    ],
                    [
                        { text: '📋 Licenses', callback_data: 'admin:licenses' },
                        { text: '📦 Products', callback_data: 'admin:products' }
                    ],
                    [
                        { text: '🔗 Webhooks', callback_data: 'admin:webhooks' },
                        { text: '🏥 Health', callback_data: 'admin:health' }
                    ],
                    [
                        { text: '🔧 System', callback_data: 'admin:system' },
                        { text: '📝 Logs', callback_data: 'admin:logs' }
                    ],
                    [
                        { text: '⚙️ Settings', callback_data: 'admin:settings' }
                    ]
                ]
            };

            await bot.sendMessage(chatId, '🔧 Admin Panel', { reply_markup: keyboard });
        } catch (error) {
            console.error('Error in admin command:', error);
            if (error.message && error.message.includes('Insufficient permissions')) {
                await bot.sendMessage(chatId, '❌ You are not authorized to use admin commands.');
            } else {
                await bot.sendMessage(chatId, '❌ An error occurred. Please try again later.');
            }
        }
    }
};

// Also export the class for backward compatibility
module.exports.AdminCommand = AdminCommand;
