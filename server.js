// server.js
require('dotenv').config(); // Add this at the top
const express = require('express');
const cors = require('cors');

const paymentRoutes = require('./routes/payment.routes'); // Updated

const app = express();

// Log environment variables for debugging
console.log('Environment Variables:', {
  CLIENT_URL: process.env.CLIENT_URL,
  PORT: process.env.PORT,
});

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:5173', 'https://lumii-jthu.vercel.app', 'https://lumiprettycollection.com'].filter(Boolean);
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Minimal server started successfully!
    Mode: development
    Port: ${PORT}
    API URL: http://localhost:${PORT}
    Allowed Client: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});
