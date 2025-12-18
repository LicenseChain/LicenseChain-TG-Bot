/**
 * Tickets Command - List support tickets
 */

module.exports = {
  name: 'tickets',
  description: 'List support tickets',
  
  async execute(msg, bot, licenseClient, dbManager) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Check admin permissions
    const adminUsers = process.env.ADMIN_USERS ? process.env.ADMIN_USERS.split(',').map(id => id.trim()) : [];
    const botOwnerId = process.env.BOT_OWNER_ID;
    const isAdmin = adminUsers.includes(userId.toString()) || userId.toString() === botOwnerId;

    try {
      const loadingMsg = await bot.sendMessage(chatId, '🔄 Fetching tickets...');

      // Get tickets (all if admin, user's only if not)
      let tickets;
      if (isAdmin) {
        tickets = await dbManager.getAllTickets();
      } else {
        // Get or create user first
        await dbManager.getOrCreateUser({
          id: userId,
          username: msg.from.username,
          first_name: msg.from.first_name,
          last_name: msg.from.last_name
        });
        tickets = await dbManager.getTickets(userId);
      }

      if (tickets.length === 0) {
        await bot.editMessageText(
          `📋 *Support Tickets*\n\n` +
          `You have no support tickets.\n\n` +
          `Use \`/ticket <subject> <description>\` to create a new ticket.`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
        return;
      }

      // Format tickets list
      let message = `📋 *Support Tickets*\n\n`;
      if (isAdmin) {
        message += `*All Tickets:*\n\n`;
      } else {
        message += `*Your Tickets:*\n\n`;
      }

      // Show first 10 tickets
      const displayTickets = tickets.slice(0, 10);
      displayTickets.forEach((ticket, index) => {
        const statusEmoji = ticket.status === 'open' ? '🟢' : 
                           ticket.status === 'closed' ? '🔴' : 
                           ticket.status === 'pending' ? '🟡' : '⚪';
        
        message += `${index + 1}. ${statusEmoji} \`${ticket.ticket_id}\`\n`;
        message += `   ${ticket.subject}\n`;
        message += `   ${new Date(ticket.created_at).toLocaleDateString()}\n\n`;
      });

      if (tickets.length > 10) {
        message += `\n... and ${tickets.length - 10} more ticket${tickets.length - 10 !== 1 ? 's' : ''}`;
      }

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Refresh', callback_data: 'list_tickets' },
              { text: '➕ New Ticket', callback_data: 'create_ticket' }
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
      console.error('Error listing tickets:', error);
      await bot.sendMessage(chatId, 
        `❌ *Error*\n\n` +
        `An error occurred while fetching tickets:\n` +
        `\`${error.message}\``,
        { parse_mode: 'Markdown' }
      );
    }
  }
};
