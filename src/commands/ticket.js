/**
 * Ticket Command - Create or view support tickets
 */

module.exports = {
  name: 'ticket',
  description: 'Create or view support tickets',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const args = msg.text.split(' ').slice(1);

    // Check admin permissions for viewing all tickets
    const adminUsers = process.env.ADMIN_USERS ? process.env.ADMIN_USERS.split(',').map(id => id.trim()) : [];
    const botOwnerId = process.env.BOT_OWNER_ID;
    const isAdmin = adminUsers.includes(userId.toString()) || userId.toString() === botOwnerId;

    // If no arguments, show usage
    if (args.length === 0) {
      await bot.sendMessage(chatId, 
        '❌ *Usage:*\n\n' +
        'Create ticket: `/ticket <subject> <description>`\n' +
        'View ticket: `/ticket <ticket-id>`\n\n' +
        'Example: `/ticket "Login Issue" "Cannot login to dashboard"`\n' +
        'Example: `/ticket TKT-1234567890-ABC123`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Check if first argument looks like a ticket ID
    const ticketIdPattern = /^TKT-\d+-[A-Z0-9]+$/i;
    const firstArg = args[0];
    
    if (ticketIdPattern.test(firstArg)) {
      // View ticket details
      await this.viewTicket(msg, bot, licenseClient, dbManager, firstArg, isAdmin);
      return;
    }

    // Create new ticket
    if (args.length < 2) {
      await bot.sendMessage(chatId, 
        '❌ *Usage:* `/ticket <subject> <description>`\n\n' +
        'Example: `/ticket "Login Issue" "Cannot login to dashboard"`\n\n' +
        'Note: Use quotes for multi-word subject or description.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Parse subject and description (handle quoted strings)
    let subject = args[0];
    let description = args.slice(1).join(' ');

    // Remove quotes if present
    if (subject.startsWith('"') && subject.endsWith('"')) {
      subject = subject.slice(1, -1);
    }
    if (description.startsWith('"') && description.endsWith('"')) {
      description = description.slice(1, -1);
    }

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Creating support ticket...');

      // Get or create user
      const user = await dbManager.getOrCreateUser({
        id: userId,
        username: msg.from.username,
        first_name: msg.from.first_name,
        last_name: msg.from.last_name
      });

      // Create ticket
      const ticket = await dbManager.createTicket(user.id, subject, description);

      const message = `✅ *Support Ticket Created*\n\n` +
        `*Ticket ID:* \`${ticket.ticketId}\`\n` +
        `*Subject:* ${subject}\n` +
        `*Description:* ${description}\n` +
        `*Status:* Open\n` +
        `*Created:* ${new Date().toLocaleString()}\n\n` +
        `Use \`/ticket ${ticket.ticketId}\` to view ticket details.\n` +
        `Use \`/tickets\` to list all your tickets.`;

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('Error creating ticket:', error);
      await bot.sendMessage(chatId, 
        `❌ *Error*\n\n` +
        `An error occurred while creating the ticket:\n` +
        `\`${error.message}\``,
        { parse_mode: 'Markdown' }
      );
    }
  },

  async viewTicket(msg, bot, licenseClient, dbManager, ticketId, isAdmin) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Fetching ticket details...');

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

      // Check permissions (users can only view their own tickets unless admin)
      if (!isAdmin && ticket.user_id !== userId) {
        await bot.editMessageText(
          `❌ *Access Denied*\n\n` +
          `You can only view your own tickets.`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
        return;
      }

      const statusEmoji = ticket.status === 'open' ? '🟢' : 
                         ticket.status === 'closed' ? '🔴' : 
                         ticket.status === 'pending' ? '🟡' : '⚪';

      const message = `🎫 *Support Ticket*\n\n` +
        `*Ticket ID:* \`${ticket.ticket_id}\`\n` +
        `*Status:* ${statusEmoji} ${ticket.status.toUpperCase()}\n` +
        `*Subject:* ${ticket.subject}\n` +
        `*Description:* ${ticket.description}\n` +
        `*Created:* ${new Date(ticket.created_at).toLocaleString()}\n` +
        `*Updated:* ${new Date(ticket.updated_at).toLocaleString()}\n`;

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📋 List Tickets', callback_data: 'list_tickets' }
            ]
          ]
        }
      };

      if (ticket.status !== 'closed' && isAdmin) {
        keyboard.reply_markup.inline_keyboard.push([
          { text: '🔒 Close Ticket', callback_data: `close_ticket_${ticket.ticket_id}` }
        ]);
      }

      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown',
        ...keyboard
      });

    } catch (error) {
      console.error('Error viewing ticket:', error);
      await bot.sendMessage(chatId, 
        `❌ *Error*\n\n` +
        `An error occurred while fetching ticket details:\n` +
        `\`${error.message}\``,
        { parse_mode: 'Markdown' }
      );
    }
  }
};
