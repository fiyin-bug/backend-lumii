import express from 'express';
import cors from 'cors';
import paymentRoutes from '../routes/index.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: "Backend is operational", mode: "ES Modules" });
});

// Mount your payment routes
app.use('/api', paymentRoutes);

export default app;
