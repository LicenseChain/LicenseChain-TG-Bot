/**
 * Vercel serverless handler for /api/health (served as /tg/health via rewrites).
 */
module.exports = function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    status: 'healthy',
    bot: 'online',
    mode: 'webhook',
    timestamp: new Date().toISOString(),
    version: process.env.LICENSECHAIN_APP_VERSION || '1.0.0'
  });
};
