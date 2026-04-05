import config from '../config/index.js';
import db from '../config/db.config.js';

/**
 * Monitoring service for tracking system health and email delivery.
 */
class MonitoringService {
  constructor() {
    this.emailFailureThreshold = 5; // Number of failures before alerting
    this.emailFailureWindow = 3600000; // 1 hour window for failure counting
    this.lastAlertTime = null;
    this.alertCooldown = 3600000; // 1 hour cooldown between alerts
  }

  /**
   * Check for email delivery issues and send alerts if needed.
   */
  async checkEmailHealth() {
    try {
      // Get email failures in the last hour
      const oneHourAgo = new Date(Date.now() - this.emailFailureWindow);
      const failures = await db.all(
        `SELECT * FROM email_failures WHERE created_at >= ?`,
        [oneHourAgo.toISOString()]
      );

      if (failures.length >= this.emailFailureThreshold) {
        // Send alert if threshold is reached
        await this.sendEmailAlert(failures);
      }

      return {
        status: 'checked',
        failures: failures.length,
        threshold: this.emailFailureThreshold,
      };
    } catch (error) {
      console.error('Email health check failed:', error);
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Send an alert about email delivery issues.
   * @param {array} failures Array of email failure records
   */
  async sendEmailAlert(failures) {
    try {
      // Check if we're in cooldown period
      if (this.lastAlertTime && 
          (Date.now() - this.lastAlertTime) < this.alertCooldown) {
        console.log('Email alert cooldown active, skipping alert');
        return;
      }

      // Create alert message
      const alertMessage = `
        🚨 Email Delivery Alert 🚨

        ${failures.length} email failures detected in the last hour:

        ${failures.map((failure, index) => `
          ${index + 1}. Reference: ${failure.reference}
             Type: ${failure.email_type}
             Error: ${failure.error_message}
             Time: ${failure.created_at}
        `).join('')}

        Please investigate the email service immediately.
      `;

      // Log the alert
      console.warn(alertMessage);

      // Send alert to business email if configured
      if (config.emailConfig.businessNotificationEmail) {
        try {
          await this.sendAlertEmail(alertMessage);
          this.lastAlertTime = Date.now();
          console.log('Email alert sent successfully');
        } catch (emailError) {
          console.error('Failed to send email alert:', emailError);
        }
      }
    } catch (error) {
      console.error('Email alert sending failed:', error);
    }
  }

  /**
   * Send an alert email to the business.
   * @param {string} message Alert message content
   */
  async sendAlertEmail(message) {
    if (!config.emailConfig.host || !config.emailConfig.auth.user || !config.emailConfig.auth.pass) {
      console.warn('Email service not configured, cannot send alert');
      return;
    }

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.emailConfig.host,
      port: config.emailConfig.port,
      secure: config.emailConfig.secure,
      auth: config.emailConfig.auth,
    });

    const mailOptions = {
      from: config.emailConfig.from,
      to: config.emailConfig.businessNotificationEmail,
      subject: '🚨 Lumis Jewelry - Email Delivery Alert',
      text: message,
      html: `
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; font-family: Arial, sans-serif;">
          <h2 style="color: #dc3545; text-align: center;">🚨 Email Delivery Alert 🚨</h2>
          <p style="background-color: #f8d7da; padding: 15px; border-radius: 5px; color: #721c24; margin: 20px 0;">
            ${message.replace(/\n/g, '<br>')}
          </p>
          <p style="text-align: center; color: #6c757d; font-size: 14px;">
            This is an automated alert from the Lumis Jewelry monitoring system.
          </p>
        </div>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`Alert email sent: ${info.messageId}`);
    } catch (error) {
      console.error('Failed to send alert email:', error);
      throw error;
    }
  }

  /**
   * Get email delivery statistics.
   */
  async getEmailStatistics() {
    try {
      const stats = {
        totalFailures: 0,
        failuresByDay: {},
        failuresByReference: {},
        recentFailures: [],
      };

      // Get all failures
      const failures = await db.all(`SELECT * FROM email_failures ORDER BY created_at DESC`);

      stats.totalFailures = failures.length;

      // Aggregate by day
      failures.forEach(failure => {
        const date = new Date(failure.created_at).toDateString();
        stats.failuresByDay[date] = (stats.failuresByDay[date] || 0) + 1;

        // Track failures by reference
        stats.failuresByReference[failure.reference] = 
          (stats.failuresByReference[failure.reference] || 0) + 1;

        // Keep recent failures
        if (stats.recentFailures.length < 10) {
          stats.recentFailures.push(failure);
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to get email statistics:', error);
      return {
        error: error.message,
      };
    }
  }

  /**
   * Clear old email failure records.
   * @param {number} daysToKeep Number of days to keep failure records
   */
  async cleanupOldFailures(daysToKeep = 30) {
    try {
      const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));
      const result = await db.run(
        `DELETE FROM email_failures WHERE created_at < ?`,
        [cutoffDate.toISOString()]
      );
      console.log(`Cleaned up ${result.changes} old email failure records`);
      return result.changes;
    } catch (error) {
      console.error('Failed to cleanup old email failures:', error);
      return 0;
    }
  }
}

// Create a singleton instance
const monitoringService = new MonitoringService();

export default monitoringService;