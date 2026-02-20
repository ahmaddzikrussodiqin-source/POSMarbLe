const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All report routes require authentication and admin role
router.get('/sales-summary', authenticateToken, requireAdmin, reportController.getSalesSummary);
router.get('/daily-sales', authenticateToken, requireAdmin, reportController.getDailySales);
router.get('/best-selling', authenticateToken, requireAdmin, reportController.getBestSellingProducts);
router.get('/hourly-sales', authenticateToken, requireAdmin, reportController.getHourlySales);
router.get('/top-cashiers', authenticateToken, requireAdmin, reportController.getTopCashiers);
router.get('/purchase-summary', authenticateToken, requireAdmin, reportController.getPurchaseSummary);
router.get('/financial-summary', authenticateToken, requireAdmin, reportController.getFinancialSummary);
router.get('/daily-purchases', authenticateToken, requireAdmin, reportController.getDailyPurchases);

module.exports = router;

