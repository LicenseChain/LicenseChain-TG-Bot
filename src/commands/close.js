/**
 * Close Command - Close a support ticket (Admin only)
 */

module.exports = {
  name: 'close',
  description: 'Close a support ticket (Admin only)',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    const PermissionManager = require('../utils/PermissionManager');
    try {
      new PermissionManager().requirePermission(userId, 'admin');
    } catch (err) {
      await bot.sendMessage(chatId, '❌ Access denied. Administrators only.', { parse_mode: 'Markdown' });
      return;
    }

    if (args.length === 0) {
      await bot.sendMessage(chatId, 
        '❌ *Usage:* `/close <ticket-id>`\n\n' +
        'Example: `/close TKT-1234567890-ABC123`\n\n' +
        'This will close the specified support ticket.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const ticketId = args[0];

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Closing ticket...');

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

      if (ticket.status === 'closed') {
        await bot.editMessageText(
          `ℹ️ *Ticket Already Closed*\n\n` +
          `Ticket \`${ticketId}\` is already closed.`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
        return;
      }

      // Close ticket
      await dbManager.updateTicketStatus(ticketId, 'closed');

      const message = `✅ *Ticket Closed*\n\n` +
        `*Ticket ID:* \`${ticketId}\`\n` +
        `*Subject:* ${ticket.subject}\n` +
        `*Status:* Closed\n` +
        `*Closed By:* ${msg.from.username || msg.from.id}\n` +
        `*Date:* ${new Date().toLocaleString()}`;

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });

      // Optionally notify the ticket creator
      try {
        await bot.sendMessage(ticket.user_id, 
          `🎫 *Ticket Closed*\n\n` +
          `Your ticket \`${ticketId}\` has been closed.\n` +
          `Subject: ${ticket.subject}\n\n` +
          `If you need further assistance, please create a new ticket.`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.warn('Could not notify ticket creator:', error.message);
      }

    } catch (error) {
      console.error('Error closing ticket:', error);
      await bot.sendMessage(chatId, 
        `❌ *Error*\n\n` +
        `An error occurred while closing the ticket:\n` +
        `\`${error.message}\``,
        { parse_mode: 'Markdown' }
      );
    }
  }
};
