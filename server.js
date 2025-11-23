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
  'https://backend-lumii-production.up.railway.app'  // Backend prod
];

const corsOptions = {
  origin: function(origin, callback) {
    // Allow non-browser requests (curl, mobile apps, etc.)
    if (!origin) return callback(null, true);

    // In production, be more permissive for CORS
    if (process.env.NODE_ENV === 'production') {
      // Allow all origins in production (Railway handles security)
      callback(null, true);
    } else {
      // In development, check against allowed origins
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed for origin: ' + origin));
      }
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
  // Development: Both HTTP and HTTPS servers
  const sslOptions = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
  };

  const httpPort = 4000; // HTTP port for Paystack callbacks

  // HTTPS server for API calls
  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`🚀 Development HTTPS server running at https://localhost:${PORT}`);
    console.log(`API calls should use: https://localhost:${PORT}/api/...`);
  });

  // HTTP server for Paystack callbacks
  const httpApp = express();
  httpApp.use(cors(corsOptions));
  httpApp.use(express.json());
  httpApp.use('/api/payment', paymentRoutes);
  httpApp.use(errorHandler);

  httpApp.listen(httpPort, () => {
    console.log(`🚀 Development HTTP server running at http://localhost:${httpPort}`);
    console.log(`Paystack callbacks use: http://localhost:${httpPort}/payment/callback`);
    console.log(`Allowed frontend origins: ${allowedOrigins.join(', ')}`);
  });
} else {
  // Production (Railway)
  app.listen(PORT, () => {
    console.log(`🚀 Production server running on port ${PORT}`);
    console.log(`Allowed frontend origins: ${allowedOrigins.join(', ')}`);
  });
}
