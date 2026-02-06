import express from 'express';
import cors from 'cors';
import paymentRoutes from '../routes/index.js';
import db from '../config/db.config.js';

// Global error catcher for Vercel debugging
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const app = express();

// Proactive CORS: Allow everything for now to stop the Network Error
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Proactive Pre-flight: Handle OPTIONS requests immediately
app.options('*', (req, res) => {
  res.status(200).send();
});

// Add this so hitting https://backend-lumii.vercel.app/ returns something
app.get('/', (req, res) => {
  res.status(200).send("Lumii Backend is Active");
});

// The health check we discussed
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api', paymentRoutes);

export default app;
