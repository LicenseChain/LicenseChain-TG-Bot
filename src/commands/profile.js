/**
 * Profile Command
 */

const { getLinkedUser } = require('../client/DashboardClient');

module.exports = {
  name: 'profile',
  description: 'Manage your profile',
  
  async execute(msg, bot, licenseClient, dbManager, translator) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      // Get or create user in local database
      const user = await dbManager.getOrCreateUser({
        id: userId,
        username: msg.from.username,
        first_name: msg.from.first_name,
        last_name: msg.from.last_name
      });
      
      const lang = await translator.getUserLanguage(userId);
      
      // Get licenses from LicenseChain API if app name is configured
      let apiLicenses = [];
      let appName = process.env.LICENSECHAIN_APP_NAME;
      
      if (appName) {
        try {
          // Try to get app first, or use appName directly as appId
          let appId = appName;
          try {
            const app = await licenseClient.getAppByName(appName);
            if (app && app.id) {
              appId = app.id;
            }
          } catch (appError) {
            // If app lookup fails, use appName as appId directly
            console.warn('Could not fetch app info, using appName as appId:', appError.message);
          }
          
          // Try to fetch licenses
          try {
            const licensesData = await licenseClient.getAppLicenses(appId);
            apiLicenses = licensesData?.licenses || licensesData || [];
          } catch (licenseError) {
            console.error('Error fetching licenses from API:', licenseError.message);
            // Continue with local stats if API fails
          }
        } catch (apiError) {
          console.error('Error fetching licenses from API:', apiError.message);
          // Continue with local stats if API fails
        }
      }
      
      const totalLicenses = apiLicenses.length;
      const activeLicenses = apiLicenses.filter(l => l.status?.toLowerCase() === 'active').length;
      
      // Get actual validation count (not all commands)
      const validationCount = await dbManager.getValidationCount(userId);
      
      // Resolve linked LicenseChain Dashboard account (tier/role) if user linked Telegram in Dashboard
      let linkedSection = '';
      try {
        const linked = await getLinkedUser(userId, { platform: 'telegram' });
        if (linked && linked.linked) {
          const tier = (linked.tier || 'free').toLowerCase();
          const role = (linked.role || 'USER').toLowerCase();
          linkedSection = '\n\n*🔗 LicenseChain Account (linked)*\n' +
            `*Tier:* ${tier}\n` +
            `*Role:* ${role}\n` +
            (linked.name ? `*Name:* ${linked.name}\n` : '') +
            (linked.email ? `*Email:* \`${linked.email}\`\n` : '');
        }
      } catch (_) {
        // Ignore; linked section is optional
      }
      
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || translator.t('profile.notSet', lang);
      
      const profileMessage = translator.t('profile.title', lang) + '\n\n' +
        translator.t('profile.userId', lang, { id: user.telegram_id }) + '\n' +
        translator.t('profile.username', lang, { username: user.username || translator.t('profile.notSet', lang) }) + '\n' +
        translator.t('profile.name', lang, { name: fullName }) + '\n' +
        translator.t('profile.memberSince', lang, { date: new Date(user.created_at).toLocaleDateString() }) + '\n\n' +
        translator.t('profile.statistics', lang) + '\n' +
        translator.t('profile.licenses', lang, { count: totalLicenses }) + '\n' +
        translator.t('profile.activeLicenses', lang, { count: activeLicenses }) + '\n' +
        translator.t('profile.validations', lang, { count: validationCount }) +
        linkedSection + '\n' +
        translator.t('profile.tapButtons', lang);

      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: translator.t('profile.editUsername', lang), callback_data: 'edit_profile:username' },
              { text: translator.t('profile.editName', lang), callback_data: 'edit_profile:name' }
            ],
            [
              { text: translator.t('profile.refresh', lang), callback_data: 'show_profile' }
            ]
          ]
        }
      };

      await bot.sendMessage(chatId, profileMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      console.error('Error in profile command:', error);
      const lang = await translator.getUserLanguage(userId);
      await bot.sendMessage(chatId, translator.t('profile.error', lang));
    }
  }
};
