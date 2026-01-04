import express from 'express';
import cors from 'cors';
// Path must include .js extension for ES Modules
import paymentRoutes from '../routes/index.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Verify connection route
app.get('/api/health', (req, res) => {
  res.json({ status: "online", message: "Vercel Handshake Successful" });
});

app.use('/api', paymentRoutes);

export default app;
