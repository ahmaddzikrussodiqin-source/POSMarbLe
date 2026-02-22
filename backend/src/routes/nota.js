const express = require('express');
const router = express.Router();
const notaController = require('../controllers/notaController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public routes - get nota settings (for POS display)
router.get('/', notaController.getNota);

// Protected routes - require authentication to update
router.put('/', authenticateToken, requireAdmin, notaController.updateNota);
router.post('/reset', authenticateToken, requireAdmin, notaController.resetNota);

module.exports = router;

