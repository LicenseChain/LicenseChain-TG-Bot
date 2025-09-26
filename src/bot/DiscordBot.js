/**
 * LicenseChain Discord Bot
 * Advanced Discord integration with enhanced functionality
 */

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const axios = require('axios');
const crypto = require('crypto');

class LicenseChainDiscordBot {
    constructor(config) {
        this.config = config;
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.DirectMessages
            ]
        });
        
        this.licenseChainAPI = axios.create({
            baseURL: config.licenseChain.baseUrl || 'https://api.licensechain.app',
            timeout: config.licenseChain.timeout || 30000,
            headers: {
                'Authorization': `Bearer ${config.licenseChain.apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'LicenseChain-Discord-Bot/1.0.0'
            }
        });
        
        this.userSessions = new Map();
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.once('ready', () => {
            console.log(`LicenseChain Discord Bot is ready! Logged in as ${this.client.user.tag}`);
            this.client.user.setActivity('LicenseChain Management', { type: 'WATCHING' });
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (interaction.isCommand()) {
                await this.handleSlashCommand(interaction);
            } else if (interaction.isButton()) {
                await this.handleButtonInteraction(interaction);
            } else if (interaction.isModalSubmit()) {
                await this.handleModalSubmit(interaction);
            }
        });

        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            
            // Handle DM commands
            if (message.channel.type === 1) { // DM channel
                await this.handleDMCommand(message);
            }
        });
    }

    async handleSlashCommand(interaction) {
        const { commandName } = interaction;

        try {
            switch (commandName) {
                case 'license':
                    await this.handleLicenseCommand(interaction);
                    break;
                case 'register':
                    await this.handleRegisterCommand(interaction);
                    break;
                case 'login':
                    await this.handleLoginCommand(interaction);
                    break;
                case 'profile':
                    await this.handleProfileCommand(interaction);
                    break;
                case 'stats':
                    await this.handleStatsCommand(interaction);
                    break;
                case 'admin':
                    await this.handleAdminCommand(interaction);
                    break;
                case 'help':
                    await this.handleHelpCommand(interaction);
                    break;
                default:
                    await interaction.reply({ content: 'Unknown command!', ephemeral: true });
            }
        } catch (error) {
            console.error('Error handling slash command:', error);
            await interaction.reply({ 
                content: 'An error occurred while processing your command.', 
                ephemeral: true 
            });
        }
    }

    async handleLicenseCommand(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'validate':
                await this.validateLicense(interaction);
                break;
            case 'info':
                await this.getLicenseInfo(interaction);
                break;
            case 'create':
                await this.createLicense(interaction);
                break;
            case 'revoke':
                await this.revokeLicense(interaction);
                break;
        }
    }

    async validateLicense(interaction) {
        const licenseKey = interaction.options.getString('license_key');
        
        try {
            const response = await this.licenseChainAPI.post('/licenses/validate', {
                license_key: licenseKey,
                app_id: this.config.licenseChain.appId
            });

            if (response.data.valid) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ License Valid')
                    .setColor(0x00ff00)
                    .addFields(
                        { name: 'License Key', value: licenseKey, inline: true },
                        { name: 'Status', value: 'Valid', inline: true },
                        { name: 'User', value: response.data.user?.email || 'N/A', inline: true },
                        { name: 'Expires', value: response.data.expires_at || 'Never', inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('❌ License Invalid')
                    .setColor(0xff0000)
                    .addFields(
                        { name: 'License Key', value: licenseKey, inline: true },
                        { name: 'Status', value: 'Invalid', inline: true },
                        { name: 'Error', value: response.data.error || 'Unknown error', inline: false }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error validating license:', error);
            await interaction.reply({ 
                content: 'Failed to validate license. Please try again later.', 
                ephemeral: true 
            });
        }
    }

    async getLicenseInfo(interaction) {
        const licenseKey = interaction.options.getString('license_key');
        
        try {
            const response = await this.licenseChainAPI.post('/licenses/validate', {
                license_key: licenseKey,
                app_id: this.config.licenseChain.appId
            });

            if (response.data.valid) {
                const embed = new EmbedBuilder()
                    .setTitle('📋 License Information')
                    .setColor(0x0099ff)
                    .addFields(
                        { name: 'License Key', value: licenseKey, inline: true },
                        { name: 'User Email', value: response.data.user?.email || 'N/A', inline: true },
                        { name: 'User Name', value: response.data.user?.name || 'N/A', inline: true },
                        { name: 'App Name', value: response.data.app?.name || 'N/A', inline: true },
                        { name: 'Status', value: response.data.license?.status || 'N/A', inline: true },
                        { name: 'Expires', value: response.data.expires_at || 'Never', inline: true },
                        { name: 'Features', value: response.data.license?.features?.join(', ') || 'None', inline: false },
                        { name: 'Usage Count', value: response.data.license?.usage_count?.toString() || '0', inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({ 
                    content: '❌ License not found or invalid.', 
                    ephemeral: true 
                });
            }
        } catch (error) {
            console.error('Error getting license info:', error);
            await interaction.reply({ 
                content: 'Failed to get license information. Please try again later.', 
                ephemeral: true 
            });
        }
    }

    async createLicense(interaction) {
        // Check if user has admin permissions
        if (!this.hasAdminPermission(interaction.member)) {
            await interaction.reply({ 
                content: '❌ You do not have permission to create licenses.', 
                ephemeral: true 
            });
            return;
        }

        const userEmail = interaction.options.getString('user_email');
        const userName = interaction.options.getString('user_name');
        const expiresAt = interaction.options.getString('expires_at');
        const features = interaction.options.getString('features')?.split(',') || [];

        try {
            const response = await this.licenseChainAPI.post('/licenses', {
                app_id: this.config.licenseChain.appId,
                user_email: userEmail,
                user_name: userName,
                expires_at: expiresAt,
                features: features
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ License Created')
                .setColor(0x00ff00)
                .addFields(
                    { name: 'License Key', value: response.data.key, inline: true },
                    { name: 'User Email', value: userEmail, inline: true },
                    { name: 'User Name', value: userName, inline: true },
                    { name: 'Expires', value: expiresAt || 'Never', inline: true },
                    { name: 'Features', value: features.join(', ') || 'None', inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error creating license:', error);
            await interaction.reply({ 
                content: 'Failed to create license. Please try again later.', 
                ephemeral: true 
            });
        }
    }

    async revokeLicense(interaction) {
        // Check if user has admin permissions
        if (!this.hasAdminPermission(interaction.member)) {
            await interaction.reply({ 
                content: '❌ You do not have permission to revoke licenses.', 
                ephemeral: true 
            });
            return;
        }

        const licenseKey = interaction.options.getString('license_key');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            // First get license info to find the license ID
            const licenseResponse = await this.licenseChainAPI.post('/licenses/validate', {
                license_key: licenseKey,
                app_id: this.config.licenseChain.appId
            });

            if (!licenseResponse.data.valid) {
                await interaction.reply({ 
                    content: '❌ License not found or invalid.', 
                    ephemeral: true 
                });
                return;
            }

            // Revoke the license
            await this.licenseChainAPI.patch(`/licenses/${licenseResponse.data.license.id}/revoke`, {
                reason: reason
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ License Revoked')
                .setColor(0xff9900)
                .addFields(
                    { name: 'License Key', value: licenseKey, inline: true },
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Revoked By', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error revoking license:', error);
            await interaction.reply({ 
                content: 'Failed to revoke license. Please try again later.', 
                ephemeral: true 
            });
        }
    }

    async handleRegisterCommand(interaction) {
        const email = interaction.options.getString('email');
        const username = interaction.options.getString('username');
        const password = interaction.options.getString('password');

        try {
            const response = await this.licenseChainAPI.post('/auth/register', {
                email: email,
                username: username,
                password: password
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ Registration Successful')
                .setColor(0x00ff00)
                .addFields(
                    { name: 'Email', value: email, inline: true },
                    { name: 'Username', value: username, inline: true },
                    { name: 'User ID', value: response.data.id, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error registering user:', error);
            await interaction.reply({ 
                content: 'Failed to register user. Please try again later.', 
                ephemeral: true 
            });
        }
    }

    async handleLoginCommand(interaction) {
        const email = interaction.options.getString('email');
        const password = interaction.options.getString('password');

        try {
            const response = await this.licenseChainAPI.post('/auth/login', {
                email: email,
                password: password
            });

            // Store user session
            this.userSessions.set(interaction.user.id, {
                userId: response.data.user.id,
                email: response.data.user.email,
                token: response.data.token,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ Login Successful')
                .setColor(0x00ff00)
                .addFields(
                    { name: 'Email', value: email, inline: true },
                    { name: 'User ID', value: response.data.user.id, inline: true },
                    { name: 'Session Expires', value: '24 hours', inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error logging in user:', error);
            await interaction.reply({ 
                content: 'Failed to login. Please check your credentials and try again.', 
                ephemeral: true 
            });
        }
    }

    async handleProfileCommand(interaction) {
        const userSession = this.userSessions.get(interaction.user.id);
        
        if (!userSession) {
            await interaction.reply({ 
                content: '❌ You are not logged in. Please use `/login` first.', 
                ephemeral: true 
            });
            return;
        }

        try {
            const response = await this.licenseChainAPI.get('/auth/me', {
                headers: {
                    'Authorization': `Bearer ${userSession.token}`
                }
            });

            const embed = new EmbedBuilder()
                .setTitle('👤 User Profile')
                .setColor(0x0099ff)
                .addFields(
                    { name: 'Email', value: response.data.email, inline: true },
                    { name: 'Name', value: response.data.name || 'N/A', inline: true },
                    { name: 'User ID', value: response.data.id, inline: true },
                    { name: 'Company', value: response.data.company || 'N/A', inline: true },
                    { name: 'Status', value: response.data.status || 'N/A', inline: true },
                    { name: 'Email Verified', value: response.data.email_verified ? 'Yes' : 'No', inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error getting user profile:', error);
            await interaction.reply({ 
                content: 'Failed to get user profile. Please try again later.', 
                ephemeral: true 
            });
        }
    }

    async handleStatsCommand(interaction) {
        try {
            const response = await this.licenseChainAPI.get('/analytics', {
                params: {
                    app_id: this.config.licenseChain.appId
                }
            });

            const embed = new EmbedBuilder()
                .setTitle('📊 LicenseChain Statistics')
                .setColor(0x0099ff)
                .addFields(
                    { name: 'Total Licenses', value: response.data.total_licenses?.toString() || '0', inline: true },
                    { name: 'Active Licenses', value: response.data.active_licenses?.toString() || '0', inline: true },
                    { name: 'Expired Licenses', value: response.data.expired_licenses?.toString() || '0', inline: true },
                    { name: 'Validations Today', value: response.data.validations_today?.toString() || '0', inline: true },
                    { name: 'Validations This Week', value: response.data.validations_this_week?.toString() || '0', inline: true },
                    { name: 'Validations This Month', value: response.data.validations_this_month?.toString() || '0', inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error getting stats:', error);
            await interaction.reply({ 
                content: 'Failed to get statistics. Please try again later.', 
                ephemeral: true 
            });
        }
    }

    async handleAdminCommand(interaction) {
        // Check if user has admin permissions
        if (!this.hasAdminPermission(interaction.member)) {
            await interaction.reply({ 
                content: '❌ You do not have permission to use admin commands.', 
                ephemeral: true 
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'users':
                await this.listUsers(interaction);
                break;
            case 'ban':
                await this.banUser(interaction);
                break;
            case 'unban':
                await this.unbanUser(interaction);
                break;
            case 'logs':
                await this.getLogs(interaction);
                break;
        }
    }

    async listUsers(interaction) {
        try {
            const response = await this.licenseChainAPI.get('/users', {
                params: {
                    app_id: this.config.licenseChain.appId,
                    limit: 10
                }
            });

            const users = response.data.data || [];
            const embed = new EmbedBuilder()
                .setTitle('👥 Recent Users')
                .setColor(0x0099ff)
                .setTimestamp();

            if (users.length === 0) {
                embed.setDescription('No users found.');
            } else {
                const userList = users.map(user => 
                    `**${user.name || user.email}**\n` +
                    `Email: ${user.email}\n` +
                    `Status: ${user.status || 'N/A'}\n` +
                    `Created: ${new Date(user.created_at).toLocaleDateString()}`
                ).join('\n\n');
                
                embed.setDescription(userList);
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error listing users:', error);
            await interaction.reply({ 
                content: 'Failed to list users. Please try again later.', 
                ephemeral: true 
            });
        }
    }

    async banUser(interaction) {
        const userEmail = interaction.options.getString('user_email');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            // Find user by email
            const usersResponse = await this.licenseChainAPI.get('/users', {
                params: {
                    app_id: this.config.licenseChain.appId,
                    email: userEmail
                }
            });

            const users = usersResponse.data.data || [];
            if (users.length === 0) {
                await interaction.reply({ 
                    content: '❌ User not found.', 
                    ephemeral: true 
                });
                return;
            }

            const user = users[0];
            
            // Ban the user (this would be a custom endpoint)
            await this.licenseChainAPI.patch(`/users/${user.id}/ban`, {
                reason: reason
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ User Banned')
                .setColor(0xff0000)
                .addFields(
                    { name: 'User', value: user.name || user.email, inline: true },
                    { name: 'Email', value: user.email, inline: true },
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Banned By', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error banning user:', error);
            await interaction.reply({ 
                content: 'Failed to ban user. Please try again later.', 
                ephemeral: true 
            });
        }
    }

    async unbanUser(interaction) {
        const userEmail = interaction.options.getString('user_email');

        try {
            // Find user by email
            const usersResponse = await this.licenseChainAPI.get('/users', {
                params: {
                    app_id: this.config.licenseChain.appId,
                    email: userEmail
                }
            });

            const users = usersResponse.data.data || [];
            if (users.length === 0) {
                await interaction.reply({ 
                    content: '❌ User not found.', 
                    ephemeral: true 
                });
                return;
            }

            const user = users[0];
            
            // Unban the user
            await this.licenseChainAPI.patch(`/users/${user.id}/unban`);

            const embed = new EmbedBuilder()
                .setTitle('✅ User Unbanned')
                .setColor(0x00ff00)
                .addFields(
                    { name: 'User', value: user.name || user.email, inline: true },
                    { name: 'Email', value: user.email, inline: true },
                    { name: 'Unbanned By', value: interaction.user.tag, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error unbanning user:', error);
            await interaction.reply({ 
                content: 'Failed to unban user. Please try again later.', 
                ephemeral: true 
            });
        }
    }

    async getLogs(interaction) {
        try {
            const response = await this.licenseChainAPI.get('/logs', {
                params: {
                    app_id: this.config.licenseChain.appId,
                    limit: 10
                }
            });

            const logs = response.data.data || [];
            const embed = new EmbedBuilder()
                .setTitle('📋 Recent Logs')
                .setColor(0x0099ff)
                .setTimestamp();

            if (logs.length === 0) {
                embed.setDescription('No logs found.');
            } else {
                const logList = logs.map(log => 
                    `**${log.type || 'LOG'}**\n` +
                    `Message: ${log.message}\n` +
                    `User: ${log.user_email || 'System'}\n` +
                    `Time: ${new Date(log.created_at).toLocaleString()}`
                ).join('\n\n');
                
                embed.setDescription(logList);
            }

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error getting logs:', error);
            await interaction.reply({ 
                content: 'Failed to get logs. Please try again later.', 
                ephemeral: true 
            });
        }
    }

    async handleHelpCommand(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 LicenseChain Discord Bot Help')
            .setColor(0x0099ff)
            .setDescription('Here are all the available commands:')
            .addFields(
                {
                    name: '🔑 License Commands',
                    value: '`/license validate` - Validate a license key\n' +
                           '`/license info` - Get detailed license information\n' +
                           '`/license create` - Create a new license (Admin only)\n' +
                           '`/license revoke` - Revoke a license (Admin only)',
                    inline: false
                },
                {
                    name: '👤 User Commands',
                    value: '`/register` - Register a new user\n' +
                           '`/login` - Login to your account\n' +
                           '`/profile` - View your profile information',
                    inline: false
                },
                {
                    name: '📊 Information Commands',
                    value: '`/stats` - View LicenseChain statistics\n' +
                           '`/help` - Show this help message',
                    inline: false
                },
                {
                    name: '⚙️ Admin Commands',
                    value: '`/admin users` - List recent users (Admin only)\n' +
                           '`/admin ban` - Ban a user (Admin only)\n' +
                           '`/admin unban` - Unban a user (Admin only)\n' +
                           '`/admin logs` - View recent logs (Admin only)',
                    inline: false
                }
            )
            .setFooter({ text: 'LicenseChain Discord Bot v1.0.0' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    async handleButtonInteraction(interaction) {
        const { customId } = interaction;
        
        switch (customId) {
            case 'login_modal':
                await this.showLoginModal(interaction);
                break;
            case 'register_modal':
                await this.showRegisterModal(interaction);
                break;
            default:
                await interaction.reply({ 
                    content: 'Unknown button interaction.', 
                    ephemeral: true 
                });
        }
    }

    async showLoginModal(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('login_modal_submit')
            .setTitle('Login to LicenseChain');

        const emailInput = new TextInputBuilder()
            .setCustomId('email')
            .setLabel('Email Address')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter your email address')
            .setRequired(true);

        const passwordInput = new TextInputBuilder()
            .setCustomId('password')
            .setLabel('Password')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter your password')
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(emailInput);
        const secondActionRow = new ActionRowBuilder().addComponents(passwordInput);

        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);
    }

    async showRegisterModal(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('register_modal_submit')
            .setTitle('Register for LicenseChain');

        const emailInput = new TextInputBuilder()
            .setCustomId('email')
            .setLabel('Email Address')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter your email address')
            .setRequired(true);

        const usernameInput = new TextInputBuilder()
            .setCustomId('username')
            .setLabel('Username')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter your username')
            .setRequired(true);

        const passwordInput = new TextInputBuilder()
            .setCustomId('password')
            .setLabel('Password')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter your password')
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(emailInput);
        const secondActionRow = new ActionRowBuilder().addComponents(usernameInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(passwordInput);

        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

        await interaction.showModal(modal);
    }

    async handleModalSubmit(interaction) {
        const { customId } = interaction;
        
        if (customId === 'login_modal_submit') {
            const email = interaction.fields.getTextInputValue('email');
            const password = interaction.fields.getTextInputValue('password');
            
            // Simulate login process
            await interaction.reply({ 
                content: `Login attempt for ${email} received. Processing...`, 
                ephemeral: true 
            });
        } else if (customId === 'register_modal_submit') {
            const email = interaction.fields.getTextInputValue('email');
            const username = interaction.fields.getTextInputValue('username');
            const password = interaction.fields.getTextInputValue('password');
            
            // Simulate registration process
            await interaction.reply({ 
                content: `Registration attempt for ${email} (${username}) received. Processing...`, 
                ephemeral: true 
            });
        }
    }

    async handleDMCommand(message) {
        const content = message.content.toLowerCase();
        
        if (content.startsWith('!license')) {
            const parts = message.content.split(' ');
            if (parts.length < 2) {
                await message.reply('Usage: `!license <license_key>`');
                return;
            }
            
            const licenseKey = parts[1];
            await this.validateLicenseDM(message, licenseKey);
        } else if (content.startsWith('!help')) {
            await this.sendHelpDM(message);
        }
    }

    async validateLicenseDM(message, licenseKey) {
        try {
            const response = await this.licenseChainAPI.post('/licenses/validate', {
                license_key: licenseKey,
                app_id: this.config.licenseChain.appId
            });

            if (response.data.valid) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ License Valid')
                    .setColor(0x00ff00)
                    .addFields(
                        { name: 'License Key', value: licenseKey, inline: true },
                        { name: 'Status', value: 'Valid', inline: true },
                        { name: 'User', value: response.data.user?.email || 'N/A', inline: true }
                    )
                    .setTimestamp();

                await message.reply({ embeds: [embed] });
            } else {
                await message.reply('❌ License is invalid or expired.');
            }
        } catch (error) {
            console.error('Error validating license in DM:', error);
            await message.reply('Failed to validate license. Please try again later.');
        }
    }

    async sendHelpDM(message) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 LicenseChain Discord Bot Help')
            .setColor(0x0099ff)
            .setDescription('Here are the available DM commands:')
            .addFields(
                {
                    name: 'DM Commands',
                    value: '`!license <key>` - Validate a license key\n' +
                           '`!help` - Show this help message',
                    inline: false
                },
                {
                    name: 'Slash Commands',
                    value: 'Use `/help` in a server to see all slash commands',
                    inline: false
                }
            )
            .setFooter({ text: 'LicenseChain Discord Bot v1.0.0' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }

    hasAdminPermission(member) {
        // Check if user has admin role or is server owner
        if (!member) return false;
        
        return member.permissions.has('Administrator') || 
               member.id === member.guild.ownerId ||
               member.roles.cache.some(role => role.name.toLowerCase().includes('admin'));
    }

    async start() {
        try {
            await this.client.login(this.config.discord.token);
        } catch (error) {
            console.error('Failed to start Discord bot:', error);
            throw error;
        }
    }

    async stop() {
        try {
            await this.client.destroy();
        } catch (error) {
            console.error('Failed to stop Discord bot:', error);
            throw error;
        }
    }
}

module.exports = LicenseChainDiscordBot;
