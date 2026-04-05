import monitoringService from '../services/monitoring.service.js';

/**
 * Monitoring endpoint for checking system health and email delivery status.
 * @param {object} req Express request object
 * @param {object} res Express response object
 */
const monitoringCheck = async (req, res) => {
  try {
    const { action } = req.query;

    let response;

    switch (action) {
      case 'email-health':
        response = await monitoringService.checkEmailHealth();
        break;

      case 'email-stats':
        response = await monitoringService.getEmailStatistics();
        break;

      case 'cleanup-failures':
        const daysToKeep = parseInt(req.query.daysToKeep) || 30;
        response = {
          cleaned: await monitoringService.cleanupOldFailures(daysToKeep),
          message: `Cleaned up email failures older than ${daysToKeep} days`,
        };
        break;

      default:
        response = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
          version: process.env.npm_package_version || 'unknown',
          monitoring: {
            emailHealth: await monitoringService.checkEmailHealth(),
            emailStats: await monitoringService.getEmailStatistics(),
          },
        };
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Monitoring check error:', error);
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message || 'Monitoring check failed',
    });
  }
};

export default monitoringCheck;