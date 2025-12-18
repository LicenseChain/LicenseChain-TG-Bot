const Logger = require('../utils/Logger');

class HelpCommand {
    constructor(licenseClient) {
        this.licenseClient = licenseClient;
        this.logger = new Logger('HelpCommand');
    }

    async handle(ctx) {
        try {
            const userId = ctx.from.id;
            const username = ctx.from.username || 'Unknown';
            
            this.logger.info(`Help command received from user ${userId} (${username})`);
            
            const message = this.getHelpMessage();
            await ctx.reply(message, { parse_mode: 'Markdown' });
        } catch (error) {
            this.logger.error('Error handling help command:', error);
            await ctx.reply('Sorry, there was an error processing your help request.');
        }
    }

    async execute(msg, bot, licenseClient, dbManager) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const username = msg.from.username || 'Unknown';
        
        try {
            const logger = new Logger('HelpCommand');
            logger.info(`Help command received from user ${userId} (${username})`);
            
            const message = this.getHelpMessage();
            await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Error in help command:', error);
            await bot.sendMessage(chatId, '❌ An error occurred. Please try again later.');
        }
    }

    getHelpMessage() {
        return `🤖 *LicenseChain Telegram Bot Help*

*Available Commands:*

🔹 /start - Start the bot and get welcome message
🔹 /help - Show this help message
🔹 /validate <license_key> - Validate a license key
🔹 /create <user_id> <product_id> - Create a new license
🔹 /info - Get your user information
🔹 /list - List your licenses
🔹 /revoke <license_key> - Revoke a license
🔹 /extend <license_key> <days> - Extend a license
🔹 /stats - Get license statistics
🔹 /settings - Manage your settings

*How to Use:*

1️⃣ *Validate License:*
   Send: \`/validate YOUR_LICENSE_KEY\`
   Or just send the license key directly

2️⃣ *Create License:*
   Send: \`/create user123 product456\`
   (Admin only)

3️⃣ *Get Your Info:*
   Send: \`/info\` to see your user information

4️⃣ *List Licenses:*
   Send: \`/list\` to see all your licenses

5️⃣ *Revoke License:*
   Send: \`/revoke YOUR_LICENSE_KEY\`
   (Admin only)

6️⃣ *Extend License:*
   Send: \`/extend YOUR_LICENSE_KEY 30\`
   (Admin only)

7️⃣ *Get Statistics:*
   Send: \`/stats\` to see license statistics

8️⃣ *Settings:*
   Send: \`/settings\` to manage your preferences

*Features:*

✅ License validation
✅ License creation
✅ User management
✅ Statistics tracking
✅ Admin panel
✅ Webhook support
✅ Error handling
✅ Logging

*Support:*

If you need help, contact our support team or visit our documentation.

*Version:* 1.0.0
*Last Updated:* ${new Date().toLocaleDateString()}`;
    }

    getAdminHelpMessage() {
        return `🔧 *Admin Commands Help*

*Admin Commands:*

🔹 /admin - Open admin panel
🔹 /create <user_id> <product_id> - Create license
🔹 /revoke <license_key> - Revoke license
🔹 /extend <license_key> <days> - Extend license
🔹 /users - List all users
🔹 /licenses - List all licenses
🔹 /stats - System statistics

*Admin Features:*

✅ User management
✅ License management
✅ System monitoring
✅ Statistics tracking
✅ Log access
✅ Configuration management

*Admin Panel:*

Use the /admin command to access the interactive admin panel with buttons for easy navigation.

*Security:*

Admin commands are restricted to authorized users only. Make sure to configure ADMIN_USERS environment variable.`;
    }

    getCommandHelp(command) {
        const helpMessages = {
            start: `🔹 *Start Command*
Usage: \`/start\`
Description: Initialize the bot and get welcome message
Example: \`/start\``,
            
            validate: `🔹 *Validate Command*
Usage: \`/validate <license_key>\`
Description: Validate a license key
Example: \`/validate ABC123DEF456GHI789JKL012MNO345\`
Note: You can also just send the license key directly`,
            
            create: `🔹 *Create Command*
Usage: \`/create <user_id> <product_id>\`
Description: Create a new license (Admin only)
Example: \`/create user123 product456\`
Note: Requires admin privileges`,
            
            info: `🔹 *Info Command*
Usage: \`/info\`
Description: Get your user information
Example: \`/info\``,
            
            list: `🔹 *List Command*
Usage: \`/list\`
Description: List all your licenses
Example: \`/list\``,
            
            revoke: `🔹 *Revoke Command*
Usage: \`/revoke <license_key>\`
Description: Revoke a license (Admin only)
Example: \`/revoke ABC123DEF456GHI789JKL012MNO345\`
Note: Requires admin privileges`,
            
            extend: `🔹 *Extend Command*
Usage: \`/extend <license_key> <days>\`
Description: Extend a license (Admin only)
Example: \`/extend ABC123DEF456GHI789JKL012MNO345 30\`
Note: Requires admin privileges`,
            
            stats: `🔹 *Stats Command*
Usage: \`/stats\`
Description: Get license statistics
Example: \`/stats\``,
            
            settings: `🔹 *Settings Command*
Usage: \`/settings\`
Description: Manage your settings
Example: \`/settings\``,
            
            admin: `🔹 *Admin Command*
Usage: \`/admin\`
Description: Open admin panel (Admin only)
Example: \`/admin\`
Note: Requires admin privileges`
        };
        
        return helpMessages[command] || 'Command not found. Use /help to see all available commands.';
    }
}

// Export as command object for CommandHandler
module.exports = {
    name: 'help',
    description: 'Show help information and available commands',
    execute: async (msg, bot, licenseClient, dbManager) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const username = msg.from.username || 'Unknown';
        
        try {
            const logger = new Logger('HelpCommand');
            logger.info(`Help command received from user ${userId} (${username})`);
            
            const helpCommand = new HelpCommand(licenseClient);
            const message = helpCommand.getHelpMessage();
            // Try Markdown first, fallback to plain text if parsing fails
            try {
                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            } catch (markdownError) {
                // Fallback to plain text if markdown parsing fails
                const plainMessage = message
                    .replace(/\*/g, '')
                    .replace(/`/g, '')
                    .replace(/_/g, '');
                await bot.sendMessage(chatId, plainMessage);
            }
        } catch (error) {
            console.error('Error in help command:', error);
            await bot.sendMessage(chatId, '❌ An error occurred. Please try again later.');
        }
    }
};

// Also export the class for backward compatibility
module.exports.HelpCommand = HelpCommand;
