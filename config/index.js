// config/index.js
require('dotenv').config();
module.exports = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  apiBaseUrl: process.env.API_BASE_URL,
  clientUrl: process.env.CLIENT_URL,
  // dbConfig: require('./db.config'), // REMOVED
  paystackConfig: require('./paystack.config'),
  emailConfig: require('./email.config'),
};