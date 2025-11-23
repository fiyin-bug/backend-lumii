// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const https = require('https');

const paymentRoutes = require('./routes/payment.routes');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// ------------------------
// CORS Configuration
// ------------------------
const allowedOrigins = [
  'http://localhost:5174',             // Frontend dev
  'http://localhost:5173',             // Alternate dev port
  'https://lumii-jthu.vercel.app',     // Frontend prod
  'https://lumiprettycollection.com',  // Frontend prod
];

const corsOptions = {
  origin: function(origin, callback) {
    // Allow non-browser requests (curl, mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for origin: ' + origin));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(express.json());

// ------------------------
// Routes
// ------------------------
app.use('/api/payment', paymentRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ------------------------
// Error Handling Middleware
// ------------------------
app.use(errorHandler);

// ------------------------
// Server Start
// ------------------------
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === 'development') {
  // HTTPS for local development
  const sslOptions = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
  };

  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`🚀 Local HTTPS server running at https://localhost:${PORT}`);
    console.log(`Allowed frontend origins: ${allowedOrigins.join(', ')}`);
  });
} else {
  // Production (Railway)
  app.listen(PORT, () => {
    console.log(`🚀 Production server running on port ${PORT}`);
    console.log(`Allowed frontend origins: ${allowedOrigins.join(', ')}`);
  });
}
