import express from 'express';
import { requireAdmin } from '../middleware/auth.middleware.js';
import productsController from '../controllers/products.controller.js';

const router = express.Router();

router.get('/', requireAdmin, productsController.listProducts);
router.get('/:id', requireAdmin, productsController.getProduct);
router.post('/', requireAdmin, productsController.createProduct);
router.put('/:id', requireAdmin, productsController.updateProduct);
router.patch('/:id', requireAdmin, productsController.updateProduct);
router.delete('/:id', requireAdmin, productsController.deleteProduct);

export default router;
