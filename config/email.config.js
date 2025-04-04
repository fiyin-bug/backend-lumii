require('dotenv').config();

module.exports = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true', // Use secure connection (SSL/TLS) based on port
  auth: {
    // Only include auth object if user/pass are actually set in .env
    user: process.env.EMAIL_USER || null,
    pass: process.env.EMAIL_PASS || null,
  },
  from: process.env.EMAIL_FROM,
  businessNotificationEmail: process.env.BUSINESS_NOTIFICATION_EMAIL,
};