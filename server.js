import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoutes from './routes/payment.routes.js'; 
import db from './config/db.config.js';

dotenv.config();

const app = express();

// --- Professional & Flexible CORS Configuration ---
const allowedOrigins = [
  'https://lumiprettycollection.com',
  'https://www.lumiprettycollection.com',
  'https://lumii-jthu.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // 1. Allow internal requests (like Postman or server-to-server)
    if (!origin) return callback(null, true);

    // 2. Allow ANY port on localhost (Fixes your Vite port-changing issue)
    const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(origin);
    
    // 3. Allow your live production domains
    const isAllowedDomain = allowedOrigins.includes(origin) || origin.includes('vercel.app');

    if (isLocalhost || isAllowedDomain) {
      callback(null, true);
    } else {
      console.error(`❌ CORS Blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-paystack-signature']
}));

app.use(express.json());

// --- Database Connectivity Log ---
console.log('📦 Database initialized:', db ? 'YES' : 'NO');

// --- Real Routes ---
app.use('/api/payment', paymentRoutes);

// Root/Health Check
app.get('/', (req, res) => {
  res.json({
    status: "Production Server Active",
    message: "Lumi Pretty Collection API",
    time: new Date().toISOString()
  });
});

// --- Server Startup ---
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Real Server running locally on http://localhost:${PORT}`);
  });
}

export default app;