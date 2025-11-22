// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const paymentRoutes = require('./routes/payment.routes');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://lumii-jthu.vercel.app',
  'https://lumiprettycollection.com'
];

// Proper CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Required for preflight
app.options('*', cors());

app.use(express.json());

// Routes
app.use('/api/payment', paymentRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Railway server (HTTP only, Railway handles SSL automatically)
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
