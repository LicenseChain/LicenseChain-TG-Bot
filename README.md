# LicenseChain Telegram Bot

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Telegraf](https://img.shields.io/badge/Telegraf-4.0+-blue.svg)](https://telegraf.js.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.5+-blue.svg)](https://www.typescriptlang.org/)

Official Telegram Bot for LicenseChain - License management and customer support through Telegram.

## 🚀 Features

- **ðŸ” License Management** - Validate, create, and manage licenses
- **ðŸ‘¤ User Support** - Handle customer inquiries and support tickets
- **ðŸ“Š Analytics** - View usage statistics and performance metrics
- **ðŸ”” Notifications** - Real-time license events and alerts
- **ðŸŽ« Ticket System** - Create and manage support tickets
- **ðŸ“ˆ Reporting** - Generate reports and analytics
- **ðŸ›¡ï¸ Security** - Secure authentication and authorization
- **ðŸ› ï¸ Easy Setup** - Simple configuration and deployment

## ðŸ“¦ Installation

### Method 1: npm (Recommended)

```bash
# Clone the repository
git clone https://github.com/LicenseChain/LicenseChain-TG-Bot.git
cd LicenseChain-TG-Bot

# Install dependencies
npm install

# Start the bot
npm start
```

### Method 2: Docker

```bash
# Build the Docker image
docker build -t licensechain-telegram-bot .

# Run the container (default port is 3005)
docker run -p 3005:3005 \
  -e TELEGRAM_TOKEN=your_telegram_token \
  -e LICENSE_CHAIN_API_KEY=your_api_key \
  licensechain-telegram-bot

# Or use custom port via environment variable
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e TELEGRAM_TOKEN=your_telegram_token \
  -e LICENSE_CHAIN_API_KEY=your_api_key \
  licensechain-telegram-bot
```

### Method 3: Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/LicenseChain/LicenseChain-TG-Bot/releases)
2. Extract to your project directory
3. Install dependencies: `npm install`
4. Configure environment variables
5. Start the bot: `npm start`

## 🚀 Quick Start

### Basic Setup

```bash
# Clone the repository
git clone https://github.com/LicenseChain/LicenseChain-TG-Bot.git
cd LicenseChain-TG-Bot

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env

# Start the bot
npm start
```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Telegram Configuration
TELEGRAM_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_URL=your-webhook-url

# LicenseChain API
LICENSECHAIN_API_KEY=your-api-key
LICENSECHAIN_APP_NAME=your-app-name
LICENSECHAIN_APP_VERSION=1.0.0
LICENSECHAIN_BASE_URL=https://api.licensechain.app

# Bot Configuration
BOT_DEBUG=false
BOT_OWNER_ID=your-telegram-user-id

# Database Configuration
DATABASE_URL=your-database-url

# Webhook Configuration
WEBHOOK_URL=your-webhook-url
WEBHOOK_SECRET=your-webhook-secret
```

## ðŸ“š Commands

### License Commands

```bash
# Validate a license
/validate <license-key>

# Get license information
/info <license-key>

# List user's licenses
/m licenses

# Create a new license
/create <user-id> <features> <expires>

# Update a license
/update <license-key> <field> <value>

# Revoke a license
/revoke <license-key>
```

### User Commands

```bash
# Get user information
/user <user-id>

# Get user's licenses
/licenses <user-id>

# Get user's analytics
/analytics <user-id>

# Ban a user
/ban <user-id> <reason>

# Unban a user
/unban <user-id>
```

### Support Commands

```bash
# Create a support ticket
/ticket <subject> <description>

# List support tickets
/tickets

# Get ticket details
/ticket <ticket-id>

# Update ticket status
/update <ticket-id> <status>

# Close a ticket
/close <ticket-id>
```

### Analytics Commands

```bash
# Get usage analytics
/usage [timeframe]

# Get license analytics
/licenses [timeframe]

# Get performance metrics
/performance

# Get error statistics
/errors
```

### Admin Commands

```bash
# Get bot status
/status

# Get bot statistics
/stats

# Reload commands
/reload

# Set bot status
/setstatus <status>

# Get bot logs
/logs [lines]
```

## ðŸ”§ Configuration

### Bot Configuration

Configure the bot through environment variables or a configuration file:

```javascript
// config/bot.js
module.exports = {
  telegram: {
    token: process.env.TELEGRAM_TOKEN,
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL
  },
  licensechain: {
    apiKey: process.env.LICENSECHAIN_API_KEY,
    appName: process.env.LICENSECHAIN_APP_NAME,
    version: process.env.LICENSECHAIN_APP_VERSION,
    baseUrl: process.env.LICENSECHAIN_BASE_URL
  },
  bot: {
    debug: process.env.BOT_DEBUG === 'true',
    ownerId: process.env.BOT_OWNER_ID
  }
};
```

### Command Configuration

Configure commands and their permissions:

```javascript
// config/commands.js
module.exports = {
  'validate': {
    permission: 'user',
    cooldown: 5000,
    description: 'Validate a license key'
  },
  'create': {
    permission: 'admin',
    cooldown: 10000,
    description: 'Create a new license'
  },
  'status': {
    permission: 'owner',
    cooldown: 0,
    description: 'Get bot status'
  }
};
```

### Database Configuration

The bot supports multiple database types:

```javascript
// PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/licensechain

// MySQL
DATABASE_URL=mysql://username:password@localhost:3306/licensechain

// SQLite
DATABASE_URL=sqlite://./database.sqlite
```

## ðŸ›¡ï¸ Security Features

### Authentication

- Telegram user verification
- Role-based command permissions
- User authentication system
- Secure API key management

### Authorization

- Command-level permissions
- User role validation
- Admin-only commands
- Owner-only functions

### Data Protection

- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Secure logging

## ðŸ“Š Analytics and Monitoring

### Command Analytics

```javascript
// Track command usage
bot.on('message', async (ctx) => {
  if (ctx.message.text.startsWith('/')) {
    analytics.track('command_used', {
      command: ctx.message.text.split(' ')[0],
      user: ctx.from.id,
      chat: ctx.chat.id,
      timestamp: new Date()
    });
  }
});
```

### Performance Monitoring

```javascript
// Monitor command execution time
const start = Date.now();
await command.execute(ctx);
const duration = Date.now() - start;
metrics.record('command_execution_time', duration);
```

### Error Tracking

```javascript
// Track command errors
try {
  await command.execute(ctx);
} catch (error) {
  errorTracker.captureException(error, {
    command: ctx.message.text.split(' ')[0],
    user: ctx.from.id,
    chat: ctx.chat.id
  });
}
```

## ðŸ”„ Error Handling

### Custom Error Types

```javascript
// Custom error classes
class CommandError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CommandError';
  }
}

class PermissionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PermissionError';
  }
}
```

### Error Middleware

```javascript
// Global error handler
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  errorTracker.captureException(err);
  
  ctx.reply('An error occurred. Please try again later.');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  errorTracker.captureException(reason);
});
```

## 🧪 Testing

### Unit Tests

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Integration Tests

```bash
# Test with real Telegram API
npm run test:integration
```

### End-to-End Tests

```bash
# Test complete command flows
npm run test:e2e
```

## ðŸ“ Examples

See the `examples/` directory for complete examples:

- `basic-setup.js` - Basic bot setup
- `custom-commands.js` - Custom command examples
- `webhook-integration.js` - Webhook handling
- `deployment.js` - Deployment configuration

## ðŸ¤ Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Clone the repository
2. Install Node.js 16 or later
3. Install dependencies: `npm install`
4. Set up environment variables
5. Start development server: `npm run dev`

## ðŸ“„ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎨 Support

- **Documentation**: [https://docs.licensechain.app/telegram-bot](https://docs.licensechain.app/telegram-bot)
- **Issues**: [GitHub Issues](https://github.com/LicenseChain/LicenseChain-TG-Bot/issues)
- **Discord**: [LicenseChain Discord](https://discord.gg/licensechain)
- **Email**: support@licensechain.app

## ðŸ”— Related Projects

- [LicenseChain Discord Bot](https://github.com/LicenseChain/LicenseChain-Discord-Bot)
- [LicenseChain Node.js SDK](https://github.com/LicenseChain/LicenseChain-NodeJS-SDK)
- [LicenseChain Customer Panel](https://github.com/LicenseChain/LicenseChain-Customer-Panel)

---

**Made with â¤ï¸ for the Telegram community**


## API Endpoints

All endpoints automatically use the /v1 prefix when connecting to https://api.licensechain.app.

### Base URL
- **Production**: https://api.licensechain.app/v1\n- **Development**: https://api.licensechain.app/v1\n\n### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /v1/health | Health check |
| POST | /v1/auth/login | User login |
| POST | /v1/auth/register | User registration |
| GET | /v1/apps | List applications |
| POST | /v1/apps | Create application |
| GET | /v1/licenses | List licenses |
| POST | /v1/licenses/verify | Verify license |
| GET | /v1/webhooks | List webhooks |
| POST | /v1/webhooks | Create webhook |
| GET | /v1/analytics | Get analytics |

**Note**: The SDK automatically prepends /v1 to all endpoints, so you only need to specify the path (e.g., /auth/login instead of /v1/auth/login).

