import express from 'express';
import cors from 'cors';
import paymentRoutes from '../routes/index.js';

const app = express();

// 1. Manually set CORS headers for every request
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5175');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // 2. Handle the "Preflight" OPTIONS request immediately
  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Respond with OK status
  }
  next();
});

app.use(express.json());

// 3. Mount routes
// Note: If vercel.json rewrites /api/ to /api/index.js,
// your routes should match the remaining path.
app.use('/api', paymentRoutes);

export default app;
