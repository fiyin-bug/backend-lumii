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
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:5177', 'https://lumii-jthu.vercel.app', 'https://lumiprettycollection.com'].filter(Boolean);
    console.log('Request Origin:', origin, 'Allowed Origins:', allowedOrigins);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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
    Allowed Client: ${process.env.CLIENT_URL || 'http://localhost:5177'}`);
});
