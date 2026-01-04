import express from 'express';
import cors from 'cors';
import paymentRoutes from '../routes/index.js';

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

// Health check to verify the server is actually running
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is alive' });
});

app.use('/api', paymentRoutes);

export default app;
