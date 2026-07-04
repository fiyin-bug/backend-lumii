import express from 'express';
import rateLimit from 'express-rate-limit';
import { login, refresh } from '../controllers/admin.controller.js';

const router = express.Router();

const limiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

router.post('/login', limiter, login);
router.post('/refresh', refresh);

export default router;
