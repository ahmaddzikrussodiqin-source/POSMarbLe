const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All routes require authentication - each user has their own products
router.get('/', authenticateToken, productController.getAll);
router.get('/:id', authenticateToken, productController.getById);

// Protected routes - require authentication and admin role
router.post('/', authenticateToken, requireAdmin, productController.create);
router.put('/:id', authenticateToken, requireAdmin, productController.update);
router.delete('/:id', authenticateToken, requireAdmin, productController.delete);
router.patch('/:id/stock', authenticateToken, requireAdmin, productController.updateStock);

module.exports = router;

