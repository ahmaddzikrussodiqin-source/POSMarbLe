const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Purchase routes - GET routes accessible to all authenticated users, POST/DELETE require admin
router.post('/', authenticateToken, requireAdmin, purchaseController.createBulkPurchase);
router.get('/', authenticateToken, purchaseController.getAll);
router.get('/today', authenticateToken, purchaseController.getTodayPurchases);
router.get('/:id', authenticateToken, purchaseController.getById);
router.delete('/:id', authenticateToken, requireAdmin, purchaseController.delete);

module.exports = router;

