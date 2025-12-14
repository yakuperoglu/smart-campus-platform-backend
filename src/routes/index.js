/**
 * API Routes Index
 * Combines all route modules
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const departmentRoutes = require('./departmentRoutes');
const enrollmentRoutes = require('./enrollmentRoutes');
const sectionRoutes = require('./sectionRoutes');
const gradesRoutes = require('./gradesRoutes');
const attendanceRoutes = require('./attendanceRoutes');

/**
 * Mount all routes
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/departments', departmentRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/sections', sectionRoutes);
router.use('/grades', gradesRoutes);
router.use('/attendance', attendanceRoutes);

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Campus API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
