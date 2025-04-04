// routes/index.js
const express = require('express');
const paymentRoutes = require('./payment.routes');

const router = express.Router();

// Mount payment routes under /api/payment
router.use('/payment', paymentRoutes);

// Simple health check route at /api/health
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

module.exports = router;