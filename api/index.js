const express = require('express');
const cors = require('cors');
const paymentRoutes = require('../routes/index.js');

const app = express();

app.use(cors({
  origin: true, // Allows all for testing; change to your frontend URL later
  credentials: true
}));
app.use(express.json());

// Base API route
app.get('/api/health', (req, res) => {
  res.json({ status: "Backend is operational", timestamp: new Date() });
});

// Mount your routes
app.use('/api', paymentRoutes);

module.exports = app;
