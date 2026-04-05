import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoutes from './routes/payment.routes.js'; 
import db from './config/db.config.js';
import paystackConfig from './config/paystack.config.js';
import CronJob from './cron.js';

// Load Environment Variables
dotenv.config();

const app = express();

const REQUIRED_ENV = {
  PAYSTACK_SECRET_KEY: !!String(paystackConfig.paystackSecretKey || '').trim(),
  CLIENT_URL: !!String(process.env.CLIENT_URL || '').trim(),
};

const hasCriticalEnvIssues = !REQUIRED_ENV.PAYSTACK_SECRET_KEY;

// --- Professional & Flexible CORS Configuration ---
const allowedOrigins = [
  'https://lumiprettycollection.com',
  'https://www.lumiprettycollection.com',
  'https://lumii-jthu.vercel.app',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:5000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or server-to-server)
    if (!origin) return callback(null, true);

    const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(origin);

    if (!isLocalhost && allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }

    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-paystack-signature']
}));

app.use(express.json({ limit: '1mb' }));

app.use((req, _res, next) => {
  req.requestStart = Date.now();
  next();
});

// --- Database Connectivity Log ---
// This will show up in your Vercel logs
console.log('📦 Database initialized:', db ? 'YES' : 'NO');

// --- Routes ---
app.use('/api/payment', paymentRoutes);

// --- Start Cron Job ---
if (process.env.NODE_ENV !== 'production') {
  const cronJob = new CronJob();
  cronJob.start();
} else {
  // In production, cron job will be handled by external scheduler
  console.log('Cron job disabled in production environment');
}

app.get('/api/health', (_req, res) => {
  res.status(hasCriticalEnvIssues ? 503 : 200).json({
    ok: !hasCriticalEnvIssues,
    service: 'backend-lumii',
    env: {
      paystackSecretConfigured: REQUIRED_ENV.PAYSTACK_SECRET_KEY,
      clientUrlConfigured: REQUIRED_ENV.CLIENT_URL,
    },
    time: new Date().toISOString(),
  });
});

// Root/Health Check (Crucial for verifying if backend is alive)
app.get('/', (req, res) => {
  res.json({
    status: "Production Server Active",
    message: "Lumi Pretty Collection API",
    time: new Date().toISOString()
  });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

app.use((err, req, res, _next) => {
  console.error('API ERROR:', {
    path: req.originalUrl,
    method: req.method,
    message: err?.message,
    durationMs: Date.now() - (req.requestStart || Date.now()),
  });

  if (res.headersSent) return;
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// --- Server Startup (Local Only) ---
// Vercel handles the listening in production; this block prevents port conflicts
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Real Server running locally on http://localhost:${PORT}`);
  });
}

// Export for Vercel
export default app;