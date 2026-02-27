const express = require('express');
const router = express.Router();
const ingredientController = require('../controllers/ingredientController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All routes require authentication - each user has their own ingredients
router.get('/', authenticateToken, ingredientController.getAll);
router.get('/product/:productId', authenticateToken, ingredientController.getProductIngredients);
router.get('/:id', authenticateToken, ingredientController.getById);

// Protected routes - require authentication and admin role
router.post('/', authenticateToken, requireAdmin, ingredientController.create);
router.put('/:id', authenticateToken, requireAdmin, ingredientController.update);
router.delete('/:id', authenticateToken, requireAdmin, ingredientController.delete);
router.patch('/:id/stock', authenticateToken, requireAdmin, ingredientController.updateStock);
router.post('/:id/purchase', authenticateToken, requireAdmin, ingredientController.purchaseStock);

// Product ingredients management
router.post('/product/:productId', authenticateToken, requireAdmin, ingredientController.setProductIngredients);

module.exports = router;

