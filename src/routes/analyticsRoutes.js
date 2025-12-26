const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// All analytics routes require admin privileges
router.use(verifyToken);
router.use(isAdmin);

router.get('/dashboard', analyticsController.getDashboardStats);
router.get('/academic-performance', analyticsController.getAcademicPerformance);
router.get('/attendance', analyticsController.getAttendanceAnalytics);
router.get('/meal-usage', analyticsController.getMealUsage);
router.get('/events', analyticsController.getEventStats);
router.get('/at-risk', analyticsController.getAtRiskAttendance);
router.get('/flagged-records', analyticsController.getFlaggedRecords);

// Export Routes
router.get('/export/excel', analyticsController.exportAnalyticsExcel);
router.get('/export/pdf', analyticsController.exportAnalyticsPDF);
router.get('/export/csv', analyticsController.exportAnalyticsCSV);

module.exports = router;
