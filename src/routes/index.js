/**
 * API Routes Index
 * Combines all route modules
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const departmentRoutes = require('./departmentRoutes');
const courseRoutes = require('./courseRoutes');
const enrollmentRoutes = require('./enrollmentRoutes');
const sectionRoutes = require('./sectionRoutes');
const gradesRoutes = require('./gradesRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const excuseRoutes = require('./excuseRoutes');
const walletRoutes = require('./walletRoutes');
const mealRoutes = require('./mealRoutes');
const eventRoutes = require('./eventRoutes');
const schedulingRoutes = require('./schedulingRoutes');
const reservationRoutes = require('./reservationRoutes');
const notificationRoutes = require('./notificationRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const clubRoutes = require('./clubRoutes');

/**
 * Mount all routes
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/departments', departmentRoutes);
router.use('/courses', courseRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/sections', sectionRoutes);
router.use('/grades', gradesRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/excuses', excuseRoutes);
router.use('/wallet', walletRoutes);
router.use('/meals', mealRoutes);
router.use('/events', eventRoutes);
router.use('/scheduling', schedulingRoutes);
router.use('/reservations', reservationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/clubs', clubRoutes);

/**
 * Health check endpoint
 * Returns API status and timestamp
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Campus API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
