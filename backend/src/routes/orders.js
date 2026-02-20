const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/auth');

// All order routes require authentication
router.post('/', authenticateToken, orderController.create);
router.get('/', authenticateToken, orderController.getAll);
router.get('/today', authenticateToken, orderController.getTodayOrders);
router.get('/:id', authenticateToken, orderController.getById);
router.delete('/:id', authenticateToken, orderController.cancel);

module.exports = router;

