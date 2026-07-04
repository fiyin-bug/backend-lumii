// config/index.js
import dotenv from 'dotenv';
import paystackConfig from './paystack.config.js';
import emailConfig from './email.config.js';

dotenv.config();
dotenv.config({ path: '.env.local' });

export default {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  apiBaseUrl: process.env.API_BASE_URL,
  clientUrl: process.env.CLIENT_URL,
  paystackConfig,
  emailConfig,
};
