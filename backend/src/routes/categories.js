const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All routes require authentication - each user has their own categories
router.get('/', authenticateToken, categoryController.getAll);
router.get('/:id', authenticateToken, categoryController.getById);

// Protected routes - require authentication and admin role
router.post('/', authenticateToken, requireAdmin, categoryController.create);
router.put('/:id', authenticateToken, requireAdmin, categoryController.update);
router.delete('/:id', authenticateToken, requireAdmin, categoryController.delete);

module.exports = router;

