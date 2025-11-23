// server.js - Local development server only
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');

const paymentRoutes = require('./routes/payment.routes');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();

// Log environment variables for debugging
console.log('Environment Variables:', {
  CLIENT_URL: process.env.CLIENT_URL,
  PORT: process.env.PORT,
});

// CORS configuration for local development
const allowedOrigins = [
  'http://localhost:5174',  // Frontend development server
  'http://localhost:5173',  // Previous frontend port
  'http://localhost:3000',  // Alternative development port
  'https://lumii-jthu.vercel.app',  // Production frontend
  'https://backend-lumii-production.up.railway.app'  // Production backend
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Railway health checks)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed for this origin: " + origin));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/payment', paymentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Local development with HTTPS
const PORT = process.env.PORT || 5000;

// SSL options
const sslOptions = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
};

https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`🚀 Local HTTPS server started successfully!
    Mode: development
    Port: ${PORT}
    API URL: https://localhost:${PORT}
    Allowed Client: ${process.env.CLIENT_URL || 'http://localhost:5174'}`);
});
