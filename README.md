# 🤖 LicenseChain Telegram Bot

**Advanced Telegram integration for LicenseChain license management**

[![License](https://img.shields.io/badge/license-Elastic%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-18%2B-green.svg)](https://nodejs.org/)
[![Telegram](https://img.shields.io/badge/telegram-bot-blue.svg)](https://core.telegram.org/bots)

## ✨ Features

### 🔐 **License Management**
- Validate license keys in real-time
- View detailed license information
- Create and manage licenses
- Track license usage and analytics
- License expiration monitoring

### 📊 **Advanced Analytics**
- Real-time usage statistics
- Revenue tracking and reporting
- User behavior analytics
- Conversion rate monitoring
- Custom dashboard metrics

### 💬 **Telegram Integration**
- Interactive commands and buttons
- Rich text formatting with Markdown
- Inline keyboards for easy navigation
- Callback queries for dynamic interactions
- Real-time notifications

### 🔔 **Automation**
- Scheduled license checks
- Expiration notifications
- Usage monitoring
- Automated reports
- Webhook integration

### 🛡️ **Security**
- Secure API communication
- User authentication
- Permission-based access
- Rate limiting protection
- Data encryption

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- Telegram Bot Token
- LicenseChain API Key
- Telegram account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/licensechain/telegram-bot.git
   cd telegram-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the bot**
   ```bash
   npm start
   ```

### Environment Variables

```env
# Telegram Configuration
TELEGRAM_TOKEN=your_telegram_bot_token
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/webhook

# LicenseChain API
LICENSE_CHAIN_API_KEY=your_api_key
LICENSE_CHAIN_API_URL=https://api.licensechain.app

# Bot Configuration
LOG_LEVEL=info
PORT=3005

# Database (Optional)
DATABASE_URL=sqlite:./data/bot.db
```

## 📚 Commands

### Basic Commands

#### `/start`
Start the bot and get welcome message with quick actions.

**Features:**
- Welcome message
- Quick action buttons
- Command overview
- User registration

#### `/help`
Show all available commands and their descriptions.

**Shows:**
- Complete command list
- Usage examples
- Quick tips
- Support information

### License Commands

#### `/validate <license_key>`
Validate a license key and get its status.

**Example:**
```
/validate LC-ABC123-DEF456-GHI789
```

**Response:**
- ✅ License Valid - Shows license details and features
- ❌ License Invalid - Shows error message
- Action buttons for more details

#### `/license`
Manage your licenses with interactive menu.

**Features:**
- List all licenses
- Create new license
- View license details
- License analytics

### Analytics Commands

#### `/analytics`
View comprehensive analytics and statistics.

**Shows:**
- Revenue overview
- License statistics
- User metrics
- Growth trends
- Usage patterns

#### `/stats`
Get quick statistics summary.

**Shows:**
- Total validations
- Active licenses
- Most used features
- Usage trends

### Profile Commands

#### `/profile`
Manage your user profile and settings.

**Features:**
- View profile information
- Update settings
- Notification preferences
- Language selection

#### `/settings`
Configure bot settings and preferences.

**Options:**
- Notification frequency
- Language settings
- Privacy options
- Data preferences

## 🔧 Configuration

### Bot Setup

1. **Create Telegram Bot**
   - Message @BotFather on Telegram
   - Use `/newbot` command
   - Follow instructions to get token

2. **Configure Bot Settings**
   - Set bot description
   - Add bot commands
   - Configure privacy settings
   - Set up webhook (optional)

3. **Get Bot Token**
   - Copy the token from BotFather
   - Add to environment variables

### Database Setup

The bot uses SQLite by default for local data storage:

```bash
# Create data directory
mkdir data

# The bot will automatically create the database
npm start
```

For production, you can use PostgreSQL or MySQL:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/licensechain_bot
```

## 🛠️ Development

### Project Structure

```
src/
├── commands/          # Bot command implementations
├── handlers/          # Message and command handlers
├── client/           # LicenseChain API client
├── database/         # Database management
├── utils/            # Utility functions
├── events/           # Telegram event handlers
└── index.js          # Main bot file
```

### Adding New Commands

1. **Create command file** in `src/commands/`
2. **Define command properties**
3. **Implement execute function**
4. **Register command** (automatic)

**Example:**
```javascript
module.exports = {
  name: 'example',
  description: 'Example command',
  
  async execute(msg, bot, licenseClient, dbManager) {
    await bot.sendMessage(msg.chat.id, 'Hello World!');
  }
};
```

### Adding New Handlers

1. **Create handler file** in `src/handlers/`
2. **Define handler logic**
3. **Register handler** in main file

**Example:**
```javascript
module.exports = {
  name: 'message',
  
  async execute(msg, bot, licenseClient, dbManager) {
    // Handle message
  }
};
```

## 📊 Monitoring

### Health Check

The bot includes a health check endpoint:

```http
GET http://localhost:3005/health
```

**Response:**
```json
{
  "status": "healthy",
  "bot": "online",
  "uptime": 3600,
  "timestamp": "2024-01-20T10:30:00.000Z",
  "version": "1.0.0"
}
```

### Statistics

Get bot statistics:

```http
GET http://localhost:3005/stats
```

**Response:**
```json
{
  "bot": {
    "username": "licensechain_bot",
    "first_name": "LicenseChain Bot",
    "id": 123456789
  },
  "users": 1250,
  "licenses": 500,
  "commands": 1500,
  "uptime": 3600,
  "memory": {
    "rss": 45678912,
    "heapTotal": 20971520,
    "heapUsed": 12345678
  }
}
```

### Logging

The bot uses Winston for structured logging:

- **Console** - Development logging
- **Files** - Production logging
- **Levels** - Error, Warn, Info, Debug

**Log Files:**
- `logs/error.log` - Error messages only
- `logs/combined.log` - All log messages

## 🚀 Deployment

### Docker Deployment

1. **Build the image:**
   ```bash
   docker build -t licensechain-telegram-bot .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name licensechain-bot \
     -e TELEGRAM_TOKEN=your_token \
     -e LICENSE_CHAIN_API_KEY=your_key \
     -p 3005:3005 \
     licensechain-telegram-bot
   ```

### Docker Compose

```yaml
version: '3.8'
services:
  telegram-bot:
    build: .
    environment:
      - TELEGRAM_TOKEN=${TELEGRAM_TOKEN}
      - LICENSE_CHAIN_API_KEY=${LICENSE_CHAIN_API_KEY}
      - DATABASE_URL=postgresql://user:pass@postgres:5432/bot
    ports:
      - "3005:3005"
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=bot
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Production Setup

1. **Set up environment variables**
2. **Configure database**
3. **Set up monitoring**
4. **Configure logging**
5. **Set up backups**
6. **Configure auto-restart**

## 🔒 Security

### API Security

- **HTTPS only** for API communication
- **API key authentication**
- **Request signing** for webhooks
- **Rate limiting** protection
- **Input validation**

### Telegram Security

- **User authentication**
- **Command validation**
- **Input sanitization**
- **Error handling**
- **Privacy protection**

### Data Protection

- **Encrypted storage** for sensitive data
- **Secure configuration** management
- **Audit logging** for actions
- **Data retention** policies
- **GDPR compliance**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run tests: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Style

- Follow JavaScript best practices
- Use ESLint configuration
- Write comprehensive tests
- Document new features
- Follow conventional commits

## 📞 Support

- **Documentation**: [docs.licensechain.app](https://docs.licensechain.app)
- **Issues**: [GitHub Issues](https://github.com/licensechain/telegram-bot/issues)
- **Email**: support@licensechain.app
- **Telegram**: [@LicenseChainSupport](https://t.me/LicenseChainSupport)

## 📄 License

This project is licensed under the Elastic License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Telegram team for the Bot API
- LicenseChain team for the API
- All contributors and supporters

---

**LicenseChain Telegram Bot** - Empowering Telegram users with license management 🤖

*Built with ❤️ by the LicenseChain Team*
