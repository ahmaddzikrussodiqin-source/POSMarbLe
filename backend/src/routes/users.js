const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All user routes require authentication and admin role
router.get('/', authenticateToken, requireAdmin, userController.getAll);
router.get('/:id', authenticateToken, requireAdmin, userController.getById);
router.post('/', authenticateToken, requireAdmin, userController.create);
router.put('/:id', authenticateToken, requireAdmin, userController.update);
router.delete('/:id', authenticateToken, requireAdmin, userController.delete);
router.post('/:id/reset-password', authenticateToken, requireAdmin, userController.resetPassword);

module.exports = router;

