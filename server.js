import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoutes from './routes/payment.routes.js'; 
import db from './config/db.config.js';

// Load Environment Variables
dotenv.config();

const app = express();

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
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-paystack-signature']
}));

app.use(express.json());

// --- Database Connectivity Log ---
// This will show up in your Vercel logs
console.log('📦 Database initialized:', db ? 'YES' : 'NO');

// --- Routes ---
app.use('/api/payment', paymentRoutes);

// Root/Health Check (Crucial for verifying if backend is alive)
app.get('/', (req, res) => {
  res.json({
    status: "Production Server Active",
    message: "Lumi Pretty Collection API",
    time: new Date().toISOString()
  });
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