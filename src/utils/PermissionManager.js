/**
 * Permission Manager for Telegram Bot
 * Handles role-based access control (User, Admin, Owner)
 */

const Logger = require('./Logger');
const logger = new Logger('PermissionManager');

class PermissionManager {
  constructor() {
    this.ownerId = (process.env.BOT_OWNER_ID || '').trim() || null;
    this.adminUserIds = (process.env.ADMIN_USERS || '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  }

  /**
   * Check if user is the bot owner
   */
  isOwner(userId) {
    if (!this.ownerId) {
      logger.warn('BOT_OWNER_ID not configured');
      return false;
    }
    return String(userId) === this.ownerId;
  }

  /**
   * Check if user is an admin (in ADMIN_USERS list or owner)
   */
  isAdmin(userId) {
    if (!userId) return false;
    const id = String(userId);
    if (this.isOwner(id)) return true;
    return this.adminUserIds.includes(id);
  }

  /**
   * Check if user is a regular user (not admin or owner)
   */
  isUser(userId) {
    if (!userId) return false;
    return !this.isAdmin(userId);
  }

  /**
   * Get user role level (owner > admin > user)
   */
  getRole(userId) {
    if (!userId) return 'user';
    if (this.isOwner(String(userId))) return 'owner';
    if (this.isAdmin(userId)) return 'admin';
    return 'user';
  }

  /**
   * Check if user has required permission level
   */
  hasPermission(userId, requiredLevel) {
    if (!userId) return false;

    const userRole = this.getRole(userId);

    const roleHierarchy = {
      user: 1,
      admin: 2,
      owner: 3
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredLevel];
  }

  /**
   * Require permission level - throws error if user doesn't have permission
   */
  requirePermission(userId, requiredLevel) {
    const hasPermission = this.hasPermission(userId, requiredLevel);

    if (!hasPermission) {
      const userRole = this.getRole(userId);
      throw new Error(`Insufficient permissions. Required: ${requiredLevel}, Your role: ${userRole}`);
    }

    return true;
  }
}

module.exports = PermissionManager;
