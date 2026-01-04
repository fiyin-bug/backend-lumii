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
