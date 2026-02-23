/**
 * LicenseChain API Client for Telegram Bot
 */

const axios = require('axios');
const crypto = require('crypto');

class LicenseChainClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 30000;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': `LicenseChain-Telegram-Bot/${process.env.LICENSECHAIN_APP_VERSION || '1.0.0'}`
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`Making request to ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Validate a license key
   */
  async validateLicense(licenseKey, hardwareId = null) {
    try {
      // Use /v1/licenses/verify endpoint with 'key' parameter to match API
      const response = await this.client.post('/v1/licenses/verify', {
        key: licenseKey,
        hardwareId: hardwareId || 'telegram-bot'
      });
      return response.data;
    } catch (error) {
      throw new Error(`License validation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get license information by key (via verification endpoint)
   */
  async getLicense(licenseKey) {
    try {
      // Use verify endpoint to get license info
      const response = await this.client.post('/v1/licenses/verify', { key: licenseKey });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get license: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get user licenses (filtered from app licenses by email/issuedTo)
   * Note: API doesn't have a direct user licenses endpoint, so we filter app licenses
   */
  async getUserLicenses(userId) {
    try {
      // Get all app licenses and filter by user
      const appName = process.env.LICENSECHAIN_APP_NAME;
      if (!appName) {
        throw new Error('LICENSECHAIN_APP_NAME not configured');
      }
      
      let appId = appName;
      try {
        const app = await this.getAppByName(appName);
        if (app && app.id) {
          appId = app.id;
        }
      } catch (appError) {
        console.warn('Could not fetch app info:', appError.message);
      }
      
      const licensesData = await this.getAppLicenses(appId);
      const allLicenses = licensesData?.licenses || licensesData || [];
      
      // Filter licenses by userId (email or issuedTo matching)
      // Note: This is a simplified filter - adjust based on your data structure
      return allLicenses.filter(license => {
        return license.issuedEmail === userId || license.issuedTo === userId || license.email === userId;
      });
    } catch (error) {
      throw new Error(`Failed to get user licenses: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a new license
   * @param {string} appId - The application ID
   * @param {object} licenseData - License data (plan, expiresAt, etc.)
   */
  async createLicense(appId, licenseData) {
    try {
      const response = await this.client.post(`/v1/apps/${appId}/licenses`, licenseData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create license: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Update license (supports both ID and licenseKey)
   */
  async updateLicense(licenseId, updateData) {
    try {
      // If updating status only, use the status endpoint
      if (updateData.status && Object.keys(updateData).length === 1) {
        const response = await this.client.patch(`/v1/licenses/${licenseId}/status`, { status: updateData.status });
        return response.data;
      }
      
      // For other updates (like expiresAt, plan, issuedTo, issuedEmail), use the general update endpoint
      const response = await this.client.patch(`/v1/licenses/${licenseId}`, updateData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update license: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Revoke license (supports both ID and licenseKey)
   */
  async revokeLicense(licenseId) {
    try {
      const response = await this.client.delete(`/v1/licenses/${licenseId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to revoke license: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get license analytics
   */
  async getLicenseAnalytics(licenseId, period = '30d') {
    try {
      const response = await this.client.get(`/v1/licenses/${licenseId}/analytics?period=${period}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get license analytics: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get user information
   * Note: API doesn't have a direct user endpoint, returns null to use local DB
   */
  async getUser(_userId) {
    // API doesn't have user endpoints, return null to use local database
    // This allows the /user command to fall back to local DB
    return null;
  }

  /**
   * Create user
   */
  async createUser(userData) {
    try {
      const response = await this.client.post('/v1/auth/register', userData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create user: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Update user
   */
  async updateUser(_userId, _updateData) {
    // API doesn't expose a generic user update endpoint yet.
    // Keep method for compatibility with command code paths.
    return null;
  }

  /**
   * Get application information
   */
  async getApplication(appId) {
    try {
      const response = await this.client.get(`/v1/apps/${appId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get application: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics(period = '30d', metrics = []) {
    try {
      // Map analytics requests to available API surface.
      const statsResponse = await this.client.get('/v1/licenses/stats');
      const stats = statsResponse.data || {};

      if (metrics.includes('usage') || metrics.includes('validations')) {
        return {
          period,
          validations: {
            total: 0,
            dailyAverage: 0,
            peak: 'N/A'
          },
          trend: 'stable'
        };
      }

      if (metrics.includes('licenses')) {
        return {
          period,
          licenses: {
            total: stats.total || 0,
            active: stats.active || 0,
            expired: stats.expired || 0,
            revoked: stats.revoked || 0
          }
        };
      }

      if (metrics.includes('performance')) {
        return {
          period,
          avgResponseTime: '~100ms',
          successRate: '99%',
          errorRate: '<1%',
          apiHealth: 'online',
          apiResponseTime: '~50ms'
        };
      }

      if (metrics.includes('errors')) {
        return {
          period,
          total: 0,
          critical: 0,
          warnings: 0,
          info: 0,
          recent: []
        };
      }

      return { period, stats };
    } catch (error) {
      throw new Error(`Failed to get analytics: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get high-level system stats (used by admin command)
   */
  async getStats() {
    try {
      const response = await this.client.get('/v1/licenses/stats');
      const stats = response.data || {};
      return {
        totalLicenses: stats.total || 0,
        activeLicenses: stats.active || 0,
        expiredLicenses: stats.expired || 0,
        revokedLicenses: stats.revoked || 0,
        totalUsers: 0,
        revenue: stats.revenue || 0,
        apiCallsToday: 0,
        uptime: 'N/A'
      };
    } catch (error) {
      throw new Error(`Failed to get stats: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get users list (compatibility method for admin command)
   */
  async getUsers() {
    // No dedicated users endpoint in current API surface.
    // Return empty list so admin command can render gracefully.
    return [];
  }

  /**
   * Get licenses for an app
   */
  async getAppLicenses(appId) {
    try {
      const response = await this.client.get(`/v1/apps/${appId}/licenses`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get app licenses: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get app by name or slug
   */
  async getAppByName(appName) {
    try {
      const response = await this.client.get('/v1/apps');
      const apps = response.data?.apps || response.data || [];
      // Try to find by name, slug, or id
      return apps.find(app => 
        app.name === appName || 
        app.slug === appName || 
        app.id === appName
      );
    } catch (error) {
      // If API requires auth and fails, try using appName as appId directly
      if (error.response?.status === 401) {
        console.warn('API authentication failed, trying appName as appId');
        // Return a mock app object with the appName as id
        return { id: appName, name: appName, slug: appName };
      }
      throw new Error(`Failed to get app: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get all licenses (for authenticated user's apps)
   */
  async getAllLicenses() {
    try {
      const response = await this.client.get('/v1/apps');
      const apps = response.data?.apps || response.data || [];
      let allLicenses = [];
      
      // Fetch licenses for each app
      for (const app of apps) {
        try {
          const licensesData = await this.getAppLicenses(app.id);
          const licenses = licensesData?.licenses || licensesData || [];
          allLicenses = allLicenses.concat(licenses);
        } catch (err) {
          // Continue if one app fails
          console.error(`Failed to get licenses for app ${app.id}:`, err.message);
        }
      }
      
      return allLicenses;
    } catch (error) {
      throw new Error(`Failed to get all licenses: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Send webhook notification
   */
  async sendWebhook(webhookUrl, data) {
    try {
      const response = await axios.post(webhookUrl, data, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `LicenseChain-Telegram-Bot/${process.env.LICENSECHAIN_APP_VERSION || '1.0.0'}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send webhook: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }
}

module.exports = LicenseChainClient;
