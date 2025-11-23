// mailer.js
const nodemailer = require('nodemailer');
const emailConfig = require('./config/email.config');

let transporter;

try {
  if (emailConfig.auth.user && emailConfig.auth.pass) {
    transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.auth.user,
        pass: emailConfig.auth.pass,
      },
    });

    transporter.verify()
      .then(() => console.log('✔ Email server ready'))
      .catch(err => console.warn('⚠ Email server verification failed (ignored):', err.message));

  } else {
    console.warn('⚠ Email credentials not set — email sending disabled');
  }
} catch (err) {
  console.warn('⚠ Nodemailer setup failed — email sending disabled', err.message);
}

module.exports = transporter;
