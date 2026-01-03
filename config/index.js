// config/index.js
import 'dotenv/config';
import paystackConfig from './paystack.config.js';
import emailConfig from './email.config.js';

export default {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  apiBaseUrl: process.env.API_BASE_URL,
  clientUrl: process.env.CLIENT_URL,
  paystackConfig,
  emailConfig,
};
