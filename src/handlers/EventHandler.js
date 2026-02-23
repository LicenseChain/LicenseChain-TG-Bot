const Logger = require('../utils/Logger');

class EventHandler {
    constructor(licenseClient) {
        this.licenseClient = licenseClient;
        this.logger = new Logger('EventHandler');
    }

    async handleCallbackQuery(ctx) {
        try {
            const data = ctx.callbackQuery.data;
            const chatId = ctx.callbackQuery.message.chat.id;
            
            this.logger.info(`Callback query received: ${data} from chat ${chatId}`);
            
            // Parse callback data
            const [action, ...params] = data.split(':');
            
            switch (action) {
                case 'validate_license':
                    await this.handleValidateCallback(ctx, params);
                    break;
                case 'create_license':
                    await this.handleCreateCallback(ctx, params);
                    break;
                case 'list_licenses':
                    await this.handleListCallback(ctx, params);
                    break;
                case 'admin_panel':
                    await this.handleAdminCallback(ctx, params);
                    break;
                case 'settings':
                    await this.handleSettingsCallback(ctx, params);
                    break;
                default:
                    await ctx.answerCbQuery('Unknown action');
                    break;
            }
        } catch (error) {
            this.logger.error('Error handling callback query:', error);
            await ctx.answerCbQuery('An error occurred');
        }
    }

    async handleText(ctx) {
        try {
            const text = ctx.message.text;
            const chatId = ctx.message.chat.id;
            const userId = ctx.message.from.id;
            
            this.logger.info(`Text message received: ${text} from user ${userId} in chat ${chatId}`);
            
            // Check if it's a license key
            if (this.isLicenseKey(text)) {
                await this.handleLicenseKeyInput(ctx, text);
                return;
            }
            
            // Check if it's a command
            if (text.startsWith('/')) {
                await ctx.reply('Use the menu buttons or type /help for available commands.');
                return;
            }
            
            // Handle other text messages
            await this.handleGeneralText(ctx, text);
        } catch (error) {
            this.logger.error('Error handling text message:', error);
            await ctx.reply('Sorry, I couldn\'t process your message.');
        }
    }

    async handlePhoto(ctx) {
        try {
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            const chatId = ctx.message.chat.id;
            const userId = ctx.message.from.id;
            
            this.logger.info(`Photo received from user ${userId} in chat ${chatId}`);
            
            await ctx.reply('I received your photo! However, I can only process text messages and license keys. Please send me a license key or use the menu buttons.');
        } catch (error) {
            this.logger.error('Error handling photo:', error);
            await ctx.reply('Sorry, I couldn\'t process your photo.');
        }
    }

    async handleDocument(ctx) {
        try {
            const document = ctx.message.document;
            const chatId = ctx.message.chat.id;
            const userId = ctx.message.from.id;
            
            this.logger.info(`Document received from user ${userId} in chat ${chatId}: ${document.file_name}`);
            
            await ctx.reply('I received your document! However, I can only process text messages and license keys. Please send me a license key or use the menu buttons.');
        } catch (error) {
            this.logger.error('Error handling document:', error);
            await ctx.reply('Sorry, I couldn\'t process your document.');
        }
    }

    async handleValidateCallback(ctx, params) {
        const [licenseKey] = params;
        
        if (!licenseKey) {
            await ctx.answerCbQuery('No license key provided');
            return;
        }
        
        try {
            const isValid = await this.licenseClient.validateLicense(licenseKey);
            
            if (isValid) {
                await ctx.answerCbQuery('✅ License is valid!');
                await ctx.reply('🎉 Your license is valid and active!');
            } else {
                await ctx.answerCbQuery('❌ License is invalid');
                await ctx.reply('❌ Sorry, this license is invalid or expired.');
            }
        } catch (error) {
            this.logger.error('Error validating license:', error);
            await ctx.answerCbQuery('Error validating license');
            await ctx.reply('Sorry, there was an error validating your license.');
        }
    }

    async handleCreateCallback(ctx, params) {
        const [userId, productId] = params;
        
        if (!userId || !productId) {
            await ctx.answerCbQuery('Missing parameters');
            return;
        }
        
        try {
            const license = await this.licenseClient.createLicense(userId, productId);
            await ctx.answerCbQuery('✅ License created!');
            await ctx.reply(`🎉 License created successfully!\n\nLicense Key: \`${license.licenseKey}\`\nUser ID: ${license.userId}\nProduct ID: ${license.productId}`, { parse_mode: 'Markdown' });
        } catch (error) {
            this.logger.error('Error creating license:', error);
            await ctx.answerCbQuery('Error creating license');
            await ctx.reply('Sorry, there was an error creating the license.');
        }
    }

    async handleListCallback(ctx, params) {
        const [userId] = params;
        
        if (!userId) {
            await ctx.answerCbQuery('No user ID provided');
            return;
        }
        
        try {
            const licenses = await this.licenseClient.getUserLicenses(userId);
            
            if (licenses.length === 0) {
                await ctx.answerCbQuery('No licenses found');
                await ctx.reply('You don\'t have any licenses yet.');
                return;
            }
            
            let message = '📋 Your Licenses:\n\n';
            licenses.forEach((license, index) => {
                message += `${index + 1}. License Key: \`${license.licenseKey}\`\n`;
                message += `   Product: ${license.productId}\n`;
                message += `   Status: ${license.status}\n`;
                message += `   Created: ${new Date(license.createdAt).toLocaleDateString()}\n\n`;
            });
            
            await ctx.answerCbQuery('Licenses retrieved');
            await ctx.reply(message, { parse_mode: 'Markdown' });
        } catch (error) {
            this.logger.error('Error listing licenses:', error);
            await ctx.answerCbQuery('Error retrieving licenses');
            await ctx.reply('Sorry, there was an error retrieving your licenses.');
        }
    }

    async handleAdminCallback(ctx, params) {
        const [action] = params;
        
        switch (action) {
            case 'stats':
                await this.handleAdminStats(ctx);
                break;
            case 'users':
                await this.handleAdminUsers(ctx);
                break;
            case 'licenses':
                await this.handleAdminLicenses(ctx);
                break;
            default:
                await ctx.answerCbQuery('Unknown admin action');
                break;
        }
    }

    async handleSettingsCallback(ctx, params) {
        const [setting, value] = params;
        
        // Handle settings changes
        await ctx.answerCbQuery('Settings updated');
        await ctx.reply('Your settings have been updated!');
    }

    async handleLicenseKeyInput(ctx, licenseKey) {
        try {
            const isValid = await this.licenseClient.validateLicense(licenseKey);
            
            if (isValid) {
                await ctx.reply('🎉 Your license is valid and active!');
            } else {
                await ctx.reply('❌ Sorry, this license is invalid or expired.');
            }
        } catch (error) {
            this.logger.error('Error validating license key:', error);
            await ctx.reply('Sorry, there was an error validating your license.');
        }
    }

    async handleGeneralText(ctx, text) {
        // Handle general text messages
        await ctx.reply('I received your message! Use /help to see available commands or send me a license key to validate it.');
    }

    isLicenseKey(text) {
        // Simple license key validation
        return text.length === 32 && /^[A-Z0-9]+$/.test(text);
    }

    async handleAdminStats(ctx) {
        try {
            const stats = await this.licenseClient.getStats();
            
            let message = '📊 Admin Statistics:\n\n';
            message += `Total Licenses: ${stats.totalLicenses}\n`;
            message += `Active Licenses: ${stats.activeLicenses}\n`;
            message += `Expired Licenses: ${stats.expiredLicenses}\n`;
            message += `Total Users: ${stats.totalUsers}\n`;
            message += `Revenue: $${stats.revenue}\n`;
            
            await ctx.answerCbQuery('Stats retrieved');
            await ctx.reply(message);
        } catch (error) {
            this.logger.error('Error getting admin stats:', error);
            await ctx.answerCbQuery('Error retrieving stats');
            await ctx.reply('Sorry, there was an error retrieving statistics.');
        }
    }

    async handleAdminUsers(ctx) {
        try {
            const users = await this.licenseClient.getUsers();
            
            let message = '👥 Users:\n\n';
            users.slice(0, 10).forEach((user, index) => {
                message += `${index + 1}. ${user.username} (${user.email})\n`;
            });
            
            if (users.length > 10) {
                message += `\n... and ${users.length - 10} more users`;
            }
            
            await ctx.answerCbQuery('Users retrieved');
            await ctx.reply(message);
        } catch (error) {
            this.logger.error('Error getting users:', error);
            await ctx.answerCbQuery('Error retrieving users');
            await ctx.reply('Sorry, there was an error retrieving users.');
        }
    }

    async handleAdminLicenses(ctx) {
        try {
            const licenses = await this.licenseClient.getAllLicenses();
            
            let message = '📋 All Licenses:\n\n';
            licenses.slice(0, 10).forEach((license, index) => {
                message += `${index + 1}. ${license.licenseKey} (${license.userId})\n`;
            });
            
            if (licenses.length > 10) {
                message += `\n... and ${licenses.length - 10} more licenses`;
            }
            
            await ctx.answerCbQuery('Licenses retrieved');
            await ctx.reply(message);
        } catch (error) {
            this.logger.error('Error getting licenses:', error);
            await ctx.answerCbQuery('Error retrieving licenses');
            await ctx.reply('Sorry, there was an error retrieving licenses.');
        }
    }
}

module.exports = EventHandler;
