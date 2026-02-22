/**
 * Translator - Internationalization (i18n) utility
 * Handles translations for the bot
 */

const Logger = require('./Logger');

class Translator {
  constructor(dbManager) {
    this.dbManager = dbManager;
    this.logger = new Logger('Translator');
    this.translations = {
      en: require('../locales/en.json'),
      es: require('../locales/es.json'),
      fr: require('../locales/fr.json'),
      de: require('../locales/de.json'),
      zh: require('../locales/zh.json'),
      ja: require('../locales/ja.json'),
      ru: require('../locales/ru.json'),
      et: require('../locales/et.json'),
      pt: require('../locales/pt.json'),
      it: require('../locales/it.json'),
      ko: require('../locales/ko.json'),
      ca: require('../locales/ca.json'),
      eu: require('../locales/eu.json'),
      gl: require('../locales/gl.json'),
      ar: require('../locales/ar.json'),
      nl: require('../locales/nl.json'),
      id: require('../locales/id.json'),
      hi: require('../locales/hi.json'),
      bn: require('../locales/bn.json'),
      vi: require('../locales/vi.json')
    };
  }

  /**
   * Get translation for a key
   * @param {string} key - Translation key (supports dot notation, e.g., 'settings.title')
   * @param {string} lang - Language code (default: 'en')
   * @param {object} params - Parameters to replace in translation
   * @returns {string} Translated text
   */
  t(key, lang = 'en', params = {}) {
    try {
      const translation = this.getNestedTranslation(key, lang);
      if (!translation) {
        this.logger.warn(`Translation missing for key: ${key} in language: ${lang}`);
        // Fallback to English
        const enTranslation = this.getNestedTranslation(key, 'en');
        if (!enTranslation) {
          return key; // Return key if no translation found
        }
        return this.replaceParams(enTranslation, params);
      }
      return this.replaceParams(translation, params);
    } catch (error) {
      this.logger.error(`Error translating key ${key}:`, error);
      return key;
    }
  }

  /**
   * Get nested translation value
   * @param {string} key - Translation key with dot notation
   * @param {string} lang - Language code
   * @returns {string|null} Translation value
   */
  getNestedTranslation(key, lang) {
    const langTranslations = this.translations[lang] || this.translations.en;
    const keys = key.split('.');
    let value = langTranslations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }
    
    return typeof value === 'string' ? value : null;
  }

  /**
   * Replace parameters in translation string
   * @param {string} text - Translation text with placeholders
   * @param {object} params - Parameters to replace
   * @returns {string} Text with replaced parameters
   */
  replaceParams(text, params) {
    let result = text;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  }

  /**
   * Get user's language preference
   * @param {number} userId - Telegram user ID
   * @returns {Promise<string>} Language code
   */
  async getUserLanguage(userId) {
    try {
      const settings = await this.dbManager.getUserSettings(userId);
      return settings.language || 'en';
    } catch (error) {
      this.logger.error(`Error getting user language for ${userId}:`, error);
      return 'en';
    }
  }

  /**
   * Translate text for a specific user
   * @param {number} userId - Telegram user ID
   * @param {string} key - Translation key
   * @param {object} params - Parameters to replace
   * @returns {Promise<string>} Translated text
   */
  async translateForUser(userId, key, params = {}) {
    const lang = await this.getUserLanguage(userId);
    return this.t(key, lang, params);
  }
}

module.exports = Translator;
