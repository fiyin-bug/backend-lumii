const express = require('express');
const cors = require('cors');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

// Define CORS options only for payment routes
const paymentCors = cors({
  origin: [
    "https://lumiprettycollection.com",
    "https://lumii-jthu.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
});

// ---------------------------
// Allow preflight on all routes
// ---------------------------
router.options('*', paymentCors);

// ---------------------------
// PAYMENT ROUTES
// ---------------------------

// Preflight + POST /initialize
router.options('/initialize', paymentCors);
router.post('/initialize', paymentCors, paymentController.initializeCheckout);

// GET /callback (Redirect from Paystack)
router.get('/callback', paymentCors, paymentController.handlePaystackCallback);

// GET /verify (Frontend verification)
router.get('/verify', paymentCors, paymentController.verifyPaymentStatus);

// Preflight + POST webhook
router.options('/webhook', paymentCors);
router.post('/webhook', paymentController.handlePaystackWebhook);

module.exports = router;

