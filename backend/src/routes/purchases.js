const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All purchase routes require authentication and admin role
router.post('/', authenticateToken, requireAdmin, purchaseController.createBulkPurchase);
router.get('/', authenticateToken, requireAdmin, purchaseController.getAll);
router.get('/today', authenticateToken, requireAdmin, purchaseController.getTodayPurchases);
router.get('/:id', authenticateToken, requireAdmin, purchaseController.getById);
router.delete('/:id', authenticateToken, requireAdmin, purchaseController.delete);

module.exports = router;

