const express = require('express');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

// POST /api/payment/initialize
// Route to initialize the payment process
router.post('/initialize', paymentController.initializeCheckout);

// GET /api/payment/callback
// This route receives the initial redirect from Paystack
// Its controller function (handlePaystackCallback) should redirect the browser to the frontend callback page.
router.get('/callback', paymentController.handlePaystackCallback);

// GET /api/payment/verify
// This route is called BY THE FRONTEND after the browser is redirected to the frontend callback page.
// Its controller function (verifyPaymentStatus) performs the actual Paystack verification.
router.get('/verify', paymentController.verifyPaymentStatus); // <-- ADD THIS ROUTE

module.exports = router;