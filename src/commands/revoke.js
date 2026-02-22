/**
 * Revoke License Command (Admin only)
 */

const Validator = require('../utils/Validator');
const PermissionManager = require('../utils/PermissionManager');

module.exports = {
  name: 'revoke',
  description: 'Revoke a license (Admin only)',

  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    const permissionManager = new PermissionManager();
    try {
      permissionManager.requirePermission(userId, 'admin');
    } catch (err) {
      await bot.sendMessage(chatId, '❌ ' + (err.message || 'Access denied. Administrators only.'), { parse_mode: 'Markdown' });
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

    let licenseKey;
    try {
      licenseKey = Validator.validateLicenseKey(args[0]);
    } catch (err) {
      await bot.sendMessage(chatId, '❌ ' + Validator.sanitizeForDisplay(err.message), { parse_mode: 'HTML' });
      return;
    }

    // Show loading message (defined outside try to be accessible in catch)
    let loadingMsg;
    try {
      loadingMsg = await bot.sendMessage(chatId, '🔄 Revoking license...');

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

      // Check if loadingMsg exists before trying to edit it
      if (loadingMsg && loadingMsg.message_id) {
        await bot.editMessageText(errorMessage, {
          chat_id: chatId,
          message_id: loadingMsg.message_id,
          parse_mode: 'Markdown'
        }).catch(() => {
          bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
        });
      } else {
        await bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
      }
    }
  }
};
