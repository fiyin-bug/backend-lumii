// routes/payment.routes.js
const express = require('express');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

// POST /api/payment/initialize
router.post('/initialize', paymentController.initializeCheckout);

// GET /api/payment/verify
router.get('/verify', paymentController.handlePaystackCallback);

module.exports = router;