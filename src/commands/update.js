/**
 * Update Command - Update license or ticket status (Admin only)
 */

const Validator = require('../utils/Validator');
const PermissionManager = require('../utils/PermissionManager');

module.exports = {
  name: 'update',
  description: 'Update a license or ticket status (Admin only)',

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

    // Parse command: /update <license-key|ticket-id> <field|status> <value>
    if (args.length < 2) {
      await bot.sendMessage(chatId, 
        '❌ *Usage:*\n\n' +
        'Update license: `/update <license_key> <field> <value>`\n' +
        'Update ticket: `/update <ticket-id> <status>`\n\n' +
        'License Examples:\n' +
        '  `/update LC-ABC123-DEF456-GHI789 status ACTIVE`\n' +
        '  `/update LC-ABC123-DEF456-GHI789 plan PRO`\n\n' +
        'Ticket Examples:\n' +
        '  `/update TKT-1234567890-ABC123 open`\n' +
        '  `/update TKT-1234567890-ABC123 pending`\n' +
        '  `/update TKT-1234567890-ABC123 closed`\n\n' +
        'License Fields: status, plan, expiresAt, issuedTo, issuedEmail\n' +
        'Ticket Statuses: open, pending, closed',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const firstArg = args[0];
    const ticketIdPattern = /^TKT-\d+-[A-Z0-9]+$/i;
    
    // Check if it's a ticket ID
    if (ticketIdPattern.test(firstArg)) {
      // Handle ticket status update
      await this.updateTicketStatus(msg, bot, licenseClient, dbManager, firstArg, args[1]);
      return;
    }

    // Handle license update
    if (args.length < 3) {
      await bot.sendMessage(chatId, 
        '❌ *Usage:* `/update <license_key> <field> <value>`\n\n' +
        'Example: `/update LC-ABC123-DEF456-GHI789 status ACTIVE`\n' +
        'Example: `/update LC-ABC123-DEF456-GHI789 plan PRO`\n' +
        'Example: `/update LC-ABC123-DEF456-GHI789 expiresAt 2026-12-31`\n\n' +
        'Fields: status, plan, expiresAt, issuedTo, issuedEmail',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    let licenseKey;
    try {
      licenseKey = Validator.validateLicenseKey(firstArg);
    } catch (err) {
      await bot.sendMessage(chatId, '❌ ' + Validator.sanitizeForDisplay(err.message), { parse_mode: 'HTML' });
      return;
    }
    const field = args[1].toLowerCase();
    const value = args.slice(2).join(' ');

    // Validate field
    const validFields = ['status', 'plan', 'expiresat', 'issuedto', 'issuedemail'];
    if (!validFields.includes(field)) {
      await bot.sendMessage(chatId, 
        `❌ *Invalid Field*\n\n` +
        `Field must be one of: status, plan, expiresAt, issuedTo, issuedEmail\n` +
        `You provided: ${field}`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Show loading message (defined outside try to be accessible in catch)
    let loadingMsg;
    try {
      loadingMsg = await bot.sendMessage(chatId, '🔄 Updating license...');

      // First, validate the license exists
      const validationResult = await licenseClient.validateLicense(licenseKey);
      
      if (!validationResult.valid) {
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

      // Prepare update data
      const updateData = {};
      
      // Map field names
      if (field === 'status') {
        updateData.status = value.toUpperCase();
      } else if (field === 'plan') {
        updateData.plan = value.toUpperCase();
      } else if (field === 'expiresat') {
        // Try to parse date
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date format. Use YYYY-MM-DD or ISO format.');
        }
        updateData.expiresAt = date.toISOString();
      } else if (field === 'issuedto') {
        updateData.issuedTo = value;
      } else if (field === 'issuedemail') {
        // Basic email validation
        if (!value.includes('@')) {
          throw new Error('Invalid email format.');
        }
        updateData.issuedEmail = value;
      }

      // API supports finding licenses by licenseKey, so we can use the key directly
      const licenseId = licenseKey;

      // Update license via API (API will find by key if not found by ID)
      const result = await licenseClient.updateLicense(licenseId, updateData);

      let message = `✅ *License Updated*\n\n` +
        `*License Key:* \`${licenseKey}\`\n` +
        `*Field Updated:* ${field}\n` +
        `*New Value:* ${value}\n`;

      if (result.status) {
        message += `*Status:* ${result.status}\n`;
      }
      if (result.plan) {
        message += `*Plan:* ${result.plan}\n`;
      }

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📋 View License', callback_data: `license_info_${licenseKey}` },
              { text: '🔄 Update Again', callback_data: 'update_license' }
            ]
          ]
        }
      };

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown',
        ...keyboard
      });

    } catch (error) {
      console.error('Error updating license:', error);
      
      const errorMessage = `❌ *Update Failed*\n\n` +
        `An error occurred while updating the license:\n` +
        `\`${error.message}\`\n\n` +
        `Please check the field and value and try again.`;

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
  },

  async updateTicketStatus(msg, bot, licenseClient, dbManager, ticketId, status) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Validate status
    const validStatuses = ['open', 'pending', 'closed'];
    if (!validStatuses.includes(status.toLowerCase())) {
      await bot.sendMessage(chatId, 
        `❌ *Invalid Status*\n\n` +
        `Status must be one of: ${validStatuses.join(', ')}\n` +
        `You provided: ${status}`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Updating ticket status...');

      // Check if ticket exists
      const ticket = await dbManager.getTicket(ticketId);
      
      if (!ticket) {
        await bot.editMessageText(
          `❌ *Ticket Not Found*\n\n` +
          `Ticket ID \`${ticketId}\` was not found.`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
        return;
      }

      // Update ticket status
      await dbManager.updateTicketStatus(ticketId, status.toLowerCase());

      const message = `✅ *Ticket Status Updated*\n\n` +
        `*Ticket ID:* \`${ticketId}\`\n` +
        `*Subject:* ${ticket.subject}\n` +
        `*Old Status:* ${ticket.status.toUpperCase()}\n` +
        `*New Status:* ${status.toUpperCase()}\n` +
        `*Updated By:* ${msg.from.username || msg.from.id}\n` +
        `*Date:* ${new Date().toLocaleString()}`;

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });

      // Optionally notify the ticket creator
      try {
        await bot.sendMessage(ticket.user_id, 
          `🎫 *Ticket Status Updated*\n\n` +
          `Your ticket \`${ticketId}\` status has been updated.\n` +
          `Subject: ${ticket.subject}\n` +
          `New Status: ${status.toUpperCase()}\n\n` +
          `Use \`/ticket ${ticketId}\` to view ticket details.`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.warn('Could not notify ticket creator:', error.message);
      }

    } catch (error) {
      console.error('Error updating ticket status:', error);
      await bot.sendMessage(chatId, 
        `❌ *Error*\n\n` +
        `An error occurred while updating ticket status:\n` +
        `\`${error.message}\``,
        { parse_mode: 'Markdown' }
      );
    }
  }
};
