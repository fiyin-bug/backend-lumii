import express from 'express';
import cors from 'cors';
import paymentRoutes from '../routes/index.js';

const app = express();

// 1. CONFIGURE CORS
app.use(cors({
  origin: ["http://localhost:5175", "https://lumii-jthu.vercel.app"],
  methods: ["POST", "GET", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// 2. PRE-FLIGHT HANDLER (Crucial for Vercel)
// This handles the "OPTIONS" request the browser sends before the POST
app.options('*', cors());

app.get('/api/health', (req, res) => {
  res.json({ status: "success", message: "CORS and SSL fixed" });
});

app.use('/api', paymentRoutes);

export default app;
