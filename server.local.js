// Local development server for testing Vercel functions
import express from 'express';
import cors from 'cors';

const app = express();

// CORS for local development
const corsOptions = {
  origin: 'http://localhost:5174', // Your specific Vite port
  methods: 'GET,POST,PUT,DELETE',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: "local-development",
    note: "Use Vercel for production: https://backend-lumii-plm7dk0yz-davids-projects-b37cdfcb.vercel.app"
  });
});

// Mock payment endpoints for local testing
app.post('/api/payment/initialize', (req, res) => {
  console.log('Local payment initialize:', req.body);
  res.json({
    success: true,
    message: 'Local development - use Vercel for real payments',
    authorizationUrl: 'https://paystack.com/pay/test-url'
  });
});

app.get('/api/payment/verify', (req, res) => {
  console.log('Local payment verify:', req.query);
  res.json({
    success: true,
    message: 'Local development - use Vercel for real verification',
    data: { status: 'success', reference: req.query.reference }
  });
});

app.get('/api/payment/callback', (req, res) => {
  console.log('Local payment callback:', req.query);
  res.redirect('http://localhost:5173/payment/callback?reference=' + req.query.reference);
});

app.post('/api/payment/webhook', (req, res) => {
  console.log('Local payment webhook:', req.body);
  res.send('Webhook received (local)');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Local development server running on http://localhost:${PORT}`);
  console.log(`📋 Production server: https://backend-lumii-plm7dk0yz-davids-projects-b37cdfcb.vercel.app`);
  console.log(`🔧 Use Vercel functions for production deployment`);
});
