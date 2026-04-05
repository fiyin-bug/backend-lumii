import monitoringService from './services/monitoring.service.js';
import config from './config/index.js';

/**
 * Scheduled tasks for system maintenance and monitoring.
 */
class CronJob {
  constructor() {
    this.emailCheckInterval = 1000 * 60 * 60; // 1 hour
    this.cleanupInterval = 1000 * 60 * 60 * 24; // 24 hours
    this.lastEmailCheck = 0;
    this.lastCleanup = 0;
  }

  /**
   * Start the scheduled tasks.
   */
  start() {
    console.log('Starting scheduled tasks...');
    this.scheduleTasks();
  }

  /**
   * Schedule periodic tasks.
   */
  scheduleTasks() {
    setInterval(() => {
      this.runEmailHealthCheck();
    }, this.emailCheckInterval);

    setInterval(() => {
      this.runCleanup();
    }, this.cleanupInterval);

    // Run immediately on startup
    this.runEmailHealthCheck();
    this.runCleanup();
  }

  /**
   * Run email health check periodically.
   */
  async runEmailHealthCheck() {
    try {
      const currentTime = Date.now();
      if (currentTime - this.lastEmailCheck < this.emailCheckInterval) {
        return;
      }

      console.log('Running scheduled email health check...');
      const result = await monitoringService.checkEmailHealth();

      if (result.status === 'checked' && result.failures > 0) {
        console.log(`Email health check: ${result.failures} failures detected`);
      } else {
        console.log('Email health check: No issues detected');
      }

      this.lastEmailCheck = currentTime;
    } catch (error) {
      console.error('Scheduled email health check failed:', error);
    }
  }

  /**
   * Run cleanup of old email failures periodically.
   */
  async runCleanup() {
    try {
      const currentTime = Date.now();
      if (currentTime - this.lastCleanup < this.cleanupInterval) {
        return;
      }

      console.log('Running scheduled cleanup of old email failures...');
      const cleaned = await monitoringService.cleanupOldFailures(30);
      console.log(`Cleanup completed: ${cleaned} records removed`);
      this.lastCleanup = currentTime;
    } catch (error) {
      console.error('Scheduled cleanup failed:', error);
    }
  }
}

// Start the cron job when this file is executed
if (require.main === module) {
  const cronJob = new CronJob();
  cronJob.start();
}

export default CronJob;