import express from 'express';
import cors from 'cors';
import paymentRoutes from '../routes/index.js'; // Ensure path is correct

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// The "Truth" test route
app.get('/api/health', (req, res) => {
  res.json({ status: "success", message: "Backend is LIVE and SSL is fixed" });
});

app.use('/api', paymentRoutes);

export default app;
