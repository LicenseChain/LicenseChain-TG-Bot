/**
 * Database Manager for Telegram Bot
 * Handles database operations and connections
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const Logger = require('../utils/Logger');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.logger = new Logger('DatabaseManager');
    this.dbPath = process.env.DATABASE_URL || path.join(__dirname, '../../data/bot.db');
  }

  async initialize() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Open database connection
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          this.logger.error('Error opening database:', err);
          throw err;
        }
        this.logger.info(`Database connected: ${this.dbPath}`);
      });

      // Create tables
      await this.createTables();

      return true;
    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const queries = [
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id INTEGER UNIQUE NOT NULL,
          username TEXT,
          first_name TEXT,
          last_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS licenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          license_key TEXT UNIQUE NOT NULL,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,
        `CREATE TABLE IF NOT EXISTS commands (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          command TEXT NOT NULL,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )`,
        `CREATE TABLE IF NOT EXISTS bot_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          total_users INTEGER DEFAULT 0,
          total_licenses INTEGER DEFAULT 0,
          total_commands INTEGER DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      ];

      let completed = 0;
      queries.forEach((query) => {
        this.db.run(query, (err) => {
          if (err) {
            this.logger.error('Error creating table:', err);
            reject(err);
            return;
          }
          completed++;
          if (completed === queries.length) {
            this.logger.info('Database tables created successfully');
            resolve();
          }
        });
      });
    });
  }

  async getUser(telegramId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE telegram_id = ?',
        [telegramId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  async createUser(userData) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO users (telegram_id, username, first_name, last_name)
         VALUES (?, ?, ?, ?)`,
        [userData.id, userData.username, userData.first_name, userData.last_name],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, ...userData });
          }
        }
      );
    });
  }

  async getOrCreateUser(userData) {
    let user = await this.getUser(userData.id);
    if (!user) {
      user = await this.createUser(userData);
    }
    return user;
  }

  async logCommand(userId, command) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO commands (user_id, command) VALUES (?, ?)',
        [userId, command],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async getBotStats() {
    return new Promise((resolve, reject) => {
      Promise.all([
        new Promise((res, rej) => {
          this.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
            if (err) rej(err);
            else res(row.count);
          });
        }),
        new Promise((res, rej) => {
          this.db.get('SELECT COUNT(*) as count FROM licenses', (err, row) => {
            if (err) rej(err);
            else res(row.count);
          });
        }),
        new Promise((res, rej) => {
          this.db.get('SELECT COUNT(*) as count FROM commands', (err, row) => {
            if (err) rej(err);
            else res(row.count);
          });
        })
      ])
        .then(([totalUsers, totalLicenses, totalCommands]) => {
          resolve({
            totalUsers,
            totalLicenses,
            totalCommands
          });
        })
        .catch(reject);
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            this.logger.error('Error closing database:', err);
            reject(err);
          } else {
            this.logger.info('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = DatabaseManager;
