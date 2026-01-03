import 'dotenv/config';

export default {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || null,
    pass: process.env.EMAIL_PASS || null,
  },
  from: process.env.EMAIL_FROM,
  businessNotificationEmail: process.env.BUSINESS_NOTIFICATION_EMAIL,
};
