import express from 'express';
import uploadsController from '../controllers/uploads.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', requireAdmin, uploadsController.upload.single('file'), uploadsController.handleUpload);

export default router;
