const express = require('express');
const router = express.Router();
const ingredientController = require('../controllers/ingredientController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public routes - get all ingredients (for POS and product management)
router.get('/', ingredientController.getAll);
router.get('/product/:productId', ingredientController.getProductIngredients);
router.get('/:id', ingredientController.getById);

// Protected routes - require authentication and admin role
router.post('/', authenticateToken, requireAdmin, ingredientController.create);
router.put('/:id', authenticateToken, requireAdmin, ingredientController.update);
router.delete('/:id', authenticateToken, requireAdmin, ingredientController.delete);
router.patch('/:id/stock', authenticateToken, requireAdmin, ingredientController.updateStock);
router.post('/:id/purchase', authenticateToken, requireAdmin, ingredientController.purchaseStock);

// Product ingredients management
router.post('/product/:productId', authenticateToken, requireAdmin, ingredientController.setProductIngredients);

module.exports = router;

