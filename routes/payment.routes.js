import express from 'express';
import cors from 'cors';
import paymentController from '../controllers/payment.controller.js';

const router = express.Router();

// CORS options for payment routes
const corsOptions = {
  origin: function (origin, callback) {
    const allowed = [
      "https://lumiprettycollection.com",
      "https://www.lumiprettycollection.com",
      "https://lumii-jthu.vercel.app"
    ];
    // Allow any localhost port and listed domains
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || allowed.includes(origin) || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-paystack-signature"],
  credentials: true,
};

// Apply CORS
router.use(cors(corsOptions));

// ---------------------------
// PAYMENT ROUTES
// ---------------------------

// 1. Initialize
router.post('/initialize', paymentController.initializeCheckout);

// 2. Callback (Redirect from Paystack)
router.get('/callback', paymentController.handlePaystackCallback);

/**
 * 3. Verify Payment Status
 * FIX: Changed from '/verify' to '/verify/:reference'
 * This matches your frontend call: /api/payment/verify/LUMIS-123
 */
router.get('/verify/:reference', paymentController.verifyPaymentStatus);

// 4. Webhook
router.post('/webhook', express.raw({type: 'application/json'}), paymentController.handlePaystackWebhook);

export default router;