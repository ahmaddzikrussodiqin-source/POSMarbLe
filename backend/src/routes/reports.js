const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

// All report routes require authentication
router.get('/sales-summary', authenticateToken, reportController.getSalesSummary);
router.get('/daily-sales', authenticateToken, reportController.getDailySales);
router.get('/best-selling', authenticateToken, reportController.getBestSellingProducts);
router.get('/hourly-sales', authenticateToken, reportController.getHourlySales);
router.get('/top-cashiers', authenticateToken, reportController.getTopCashiers);
router.get('/purchase-summary', authenticateToken, reportController.getPurchaseSummary);
router.get('/financial-summary', authenticateToken, reportController.getFinancialSummary);
router.get('/daily-purchases', authenticateToken, reportController.getDailyPurchases);

module.exports = router;

