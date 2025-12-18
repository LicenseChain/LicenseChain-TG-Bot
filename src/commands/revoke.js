/**
 * Revoke License Command (Admin only)
 */

module.exports = {
  name: 'revoke',
  description: 'Revoke a license (Admin only)',
  
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

    if (args.length === 0) {
      await bot.sendMessage(chatId, 
        '❌ *Usage:* `/revoke <license_key>`\n\n' +
        'Example: `/revoke LC-ABC123-DEF456-GHI789`\n\n' +
        '⚠️ *Warning:* This will permanently revoke the license.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const licenseKey = args[0];

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Revoking license...');

      // First, validate the license exists
      const validationResult = await licenseClient.validateLicense(licenseKey);
      
      if (!validationResult.valid && validationResult.reason !== 'License has expired') {
        await bot.editMessageText(
          `❌ *License Not Found*\n\n` +
          `License key \`${licenseKey}\` was not found.\n` +
          `Reason: ${validationResult.reason || 'License key not found'}`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
        return;
      }

      // API supports finding licenses by licenseKey, so we can use the key directly
      const licenseId = licenseKey;
      
      try {
        const result = await licenseClient.revokeLicense(licenseId);
        
        let message = `✅ *License Revoked*\n\n` +
          `*License Key:* \`${licenseKey}\`\n` +
          `*Status:* Revoked\n` +
          `*Action:* License has been permanently revoked.\n\n` +
          `⚠️ This license can no longer be used for validation.`;

        await bot.editMessageText(message, {
          chat_id: chatId,
          message_id: loadingMsg.message_id,
          parse_mode: 'Markdown'
        });
      } catch (revokeError) {
        // If API revoke fails, try updating status to REVOKED
        console.warn('Direct revoke failed, trying status update:', revokeError.message);
        
        try {
          const updateResult = await licenseClient.updateLicense(licenseId, {
            status: 'REVOKED'
          });
          
          let message = `✅ *License Revoked*\n\n` +
            `*License Key:* \`${licenseKey}\`\n` +
            `*Status:* Revoked\n` +
            `*Action:* License status has been updated to REVOKED.\n\n` +
            `⚠️ This license can no longer be used for validation.`;

          await bot.editMessageText(message, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
          });
        } catch (updateError) {
          throw new Error(`Failed to revoke license: ${updateError.message}`);
        }
      }

    } catch (error) {
      console.error('Error revoking license:', error);
      
      const errorMessage = `❌ *Revocation Failed*\n\n` +
        `An error occurred while revoking the license:\n` +
        `\`${error.message}\`\n\n` +
        `Please check the license key and try again.`;

      await bot.editMessageText(errorMessage, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      }).catch(() => {
        bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
      });
    }
  }
};
