const express = require('express');
const router = express.Router();
const notaController = require('../controllers/notaController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All routes require authentication - each user has their own nota settings
router.get('/', authenticateToken, notaController.getNota);

// Protected routes - require authentication and admin role to update
router.put('/', authenticateToken, requireAdmin, notaController.updateNota);
router.post('/reset', authenticateToken, requireAdmin, notaController.resetNota);

module.exports = router;

