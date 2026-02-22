const crypto = require('crypto');

class Utils {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validateLicenseKey(licenseKey) {
        if (!licenseKey || typeof licenseKey !== 'string') {
            return false;
        }
        
        // License key should be 32 characters long and contain only alphanumeric characters
        return licenseKey.length === 32 && /^[A-Z0-9]+$/.test(licenseKey);
    }

    static generateLicenseKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }

    static generateMD5Hash(input) {
        if (!input) return '';
        return crypto.createHash('md5').update(input).digest('hex');
    }

    static generateSHA256Hash(input) {
        if (!input) return '';
        return crypto.createHash('sha256').update(input).digest('hex');
    }

    static sanitizeInput(input) {
        if (!input || typeof input !== 'string') return '';
        
        return input
            .replace(/'/g, "''")
            .replace(/"/g, '""')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/&/g, '&amp;');
    }

    static formatISODate(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        return date.toISOString();
    }

    static parseISODate(isoDate) {
        if (!isoDate) return null;
        
        try {
            return new Date(isoDate);
        } catch (error) {
            return null;
        }
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static retry(fn, maxRetries = 3, delay = 1000) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            
            const attempt = async () => {
                try {
                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    attempts++;
                    if (attempts >= maxRetries) {
                        reject(error);
                    } else {
                        setTimeout(attempt, delay * attempts);
                    }
                }
            };
            
            attempt();
        });
    }

    static generateRandomString(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }

    static generateUUID() {
        return crypto.randomUUID();
    }

    static hashPassword(password) {
        if (!password) return '';
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    static verifyPassword(password, hash) {
        if (!password || !hash) return false;
        return this.hashPassword(password) === hash;
    }

    static createWebhookSignature(payload, secret) {
        if (!payload || !secret) return '';
        return crypto.createHmac('sha256', secret).update(payload).digest('hex');
    }

    static verifyWebhookSignature(payload, signature, secret) {
        if (!payload || !signature || !secret) return false;
        const expectedSignature = this.createWebhookSignature(payload, secret);
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    }

    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    static formatDuration(ms) {
        if (ms < 1000) return ms + 'ms';
        if (ms < 60000) return Math.floor(ms / 1000) + 's';
        if (ms < 3600000) return Math.floor(ms / 60000) + 'm ' + Math.floor((ms % 60000) / 1000) + 's';
        return Math.floor(ms / 3600000) + 'h ' + Math.floor((ms % 3600000) / 60000) + 'm';
    }

    static formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    }

    static formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    static formatDate(date, locale = 'en-US') {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        return new Intl.DateTimeFormat(locale).format(date);
    }

    static formatDateTime(date, locale = 'en-US') {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(date);
    }

    static isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    static extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch (_) {
            return null;
        }
    }

    static capitalizeFirst(str) {
        if (!str || typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static capitalizeWords(str) {
        if (!str || typeof str !== 'string') return '';
        return str.split(' ').map(word => this.capitalizeFirst(word)).join(' ');
    }

    static truncateString(str, maxLength, suffix = '...') {
        if (!str || typeof str !== 'string') return '';
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - suffix.length) + suffix;
    }

    static removeSpecialChars(str) {
        if (!str || typeof str !== 'string') return '';
        return str.replace(/[^a-zA-Z0-9\s]/g, '');
    }

    static slugify(str) {
        if (!str || typeof str !== 'string') return '';
        return str
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
        return obj;
    }

    static mergeObjects(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();
        
        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.mergeObjects(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }
        
        return this.mergeObjects(target, ...sources);
    }

    static isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    static isEmpty(value) {
        if (value == null) return true;
        if (typeof value === 'string') return value.trim().length === 0;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    }

    static isNotEmpty(value) {
        return !this.isEmpty(value);
    }
}

module.exports = Utils;
