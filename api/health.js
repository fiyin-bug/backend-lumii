import config from '../config/index.js';
import { sendBusinessNotification, sendBuyerInvoice } from '../services/email.service.js';

/**
 * Health check endpoint that verifies system status.
 * @param {object} req Express request object
 * @param {object} res Express response object
 */
const healthCheck = async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || 'unknown',
      system: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      database: {
        status: 'unknown',
        message: 'Database connection check not implemented',
      },
      email: {
        status: 'unknown',
        message: 'Email service check not implemented',
      },
      paystack: {
        status: 'unknown',
        message: 'Paystack service check not implemented',
      },
    };

    // Check database connection
    try {
      // Simple query to test database connectivity
      const testQuery = await db.get('SELECT 1 + 1 AS test');
      if (testQuery && testQuery.test === 2) {
        health.database.status = 'healthy';
        health.database.message = 'Database connection successful';
      }
    } catch (dbError) {
      health.database.status = 'unhealthy';
      health.database.message = `Database connection failed: ${dbError.message}`;
    }

    // Check email service configuration
    if (config.emailConfig.host && config.emailConfig.auth.user && config.emailConfig.auth.pass) {
      health.email.status = 'configured';
      health.email.message = 'Email service configured';
    } else {
      health.email.status = 'unconfigured';
      health.email.message = 'Email service not fully configured';
    }

    // Check Paystack configuration
    if (process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_PUBLIC_KEY) {
      health.paystack.status = 'configured';
      health.paystack.message = 'Paystack configured';
    } else {
      health.paystack.status = 'unconfigured';
      health.paystack.message = 'Paystack not configured';
    }

    // Test email service if configured
    if (health.email.status === 'configured') {
      try {
        // Test email service by sending a test email
        const testEmailResult = await sendBusinessNotification({
          reference: 'HEALTH-CHECK',
          metadata: {
            customer_name: 'Test User',
            customer_email: config.emailConfig.from,
            customer_phone: '000-000-0000',
            shipping_address: {
              street: '123 Test St',
              city: 'Test City',
              state: 'TS',
              postalCode: '12345',
              country: 'Testland',
            },
            cart_items: [
              {
                name: 'Test Product',
                quantity: 1,
                price: 1000,
              },
            ],
          },
          amount: 1000,
          name: 'HEALTH-CHECK',
          channel: 'test',
          paid_at: new Date().toISOString(),
        });

        health.email.status = 'healthy';
        health.email.message = 'Email service test successful';
      } catch (emailError) {
        health.email.status = 'unhealthy';
        health.email.message = `Email service test failed: ${emailError.message}`;
      }
    }

    return res.status(200).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message || 'Health check failed',
    });
  }
};

export default healthCheck;