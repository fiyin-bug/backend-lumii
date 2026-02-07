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
  origin: [
    "https://lumii-jthu.vercel.app",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002"
  ],
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