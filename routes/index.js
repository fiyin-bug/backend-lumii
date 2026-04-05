// routes/index.js
import express from 'express';
import paymentRoutes from './payment.routes.js';

const router = express.Router();

// Mount payment routes under /api/payment
router.use('/payment', paymentRoutes);

// Health check route at /api/health
import healthCheck from '../api/health.js';
import monitoringCheck from '../api/monitoring.js';

router.get('/health', healthCheck);
router.get('/monitoring', monitoringCheck);

export default router;
