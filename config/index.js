// config/index.js
require('dotenv').config();
const paystackConfig = require('./paystack.config.js');
const emailConfig = require('./email.config.js');

module.exports = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  apiBaseUrl: process.env.API_BASE_URL,
  clientUrl: process.env.CLIENT_URL,
  paystackConfig,
  emailConfig,
};
