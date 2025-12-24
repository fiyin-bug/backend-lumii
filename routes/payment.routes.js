import express from 'express';
import cors from 'cors';
import paymentController from '../controllers/payment.controller';

const router = express.Router();

// CORS options for payment routes
const corsOptions = {
  origin: [
    "https://lumiprettycollection.com",
    "https://www.lumiprettycollection.com",
    "https://lumii-jthu.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
};

// Apply CORS to all routes in this router
router.use(cors(corsOptions));

// ---------------------------
// PAYMENT ROUTES
// ---------------------------

router.post('/initialize', paymentController.initializeCheckout);

// GET /callback (Redirect from Paystack)
router.get('/callback', paymentController.handlePaystackCallback);

// GET /verify (Frontend verification)
router.get('/verify', paymentController.verifyPaymentStatus);

// POST webhook
router.post('/webhook', paymentController.handlePaystackWebhook);

export default router;
