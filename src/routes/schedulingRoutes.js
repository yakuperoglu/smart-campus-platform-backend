/**
 * Scheduling Routes
 * 
 * API endpoints for automatic course scheduling (CSP algorithm).
 * 
 * @swagger
 * tags:
 *   name: Scheduling
 *   description: Automatic course scheduling using CSP algorithm
 */

const express = require('express');
const router = express.Router();
const schedulingController = require('../controllers/schedulingController');
const { verifyToken } = require('../middleware/authMiddleware');

// Middleware for admin only
const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
};

/**
 * @swagger
 * /scheduling/info:
 *   get:
 *     summary: Get scheduling configuration info
 *     tags: [Scheduling]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduling configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     sections_by_semester:
 *                       type: array
 *                     available_classrooms:
 *                       type: integer
 *                     time_slots:
 *                       type: array
 *                     days_of_week:
 *                       type: array
 */
router.get('/info', verifyToken, adminOnly, schedulingController.getSchedulingInfo);

/**
 * @swagger
 * /scheduling/schedule:
 *   get:
 *     summary: Get current schedule for a semester
 *     tags: [Scheduling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: semester
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Fall, Spring, Summer]
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: section_id
 *         schema:
 *           type: string
 *         description: Filter by section ID
 *       - in: query
 *         name: classroom_id
 *         schema:
 *           type: string
 *         description: Filter by classroom ID
 *       - in: query
 *         name: instructor_id
 *         schema:
 *           type: string
 *         description: Filter by instructor ID
 *     responses:
 *       200:
 *         description: Schedule data
 */
router.get('/schedule', verifyToken, schedulingController.getSchedule);

/**
 * @swagger
 * /scheduling/generate:
 *   post:
 *     summary: Generate schedule using CSP algorithm (Admin only)
 *     tags: [Scheduling]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - semester
 *               - year
 *             properties:
 *               semester:
 *                 type: string
 *                 enum: [Fall, Spring, Summer]
 *                 example: Fall
 *               year:
 *                 type: integer
 *                 example: 2024
 *               preview_only:
 *                 type: boolean
 *                 default: false
 *                 description: If true, don't save to database (dry run)
 *     responses:
 *       200:
 *         description: Schedule generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         total_sections:
 *                           type: integer
 *                         scheduled_sections:
 *                           type: integer
 *                         backtrack_count:
 *                           type: integer
 *                         duration_ms:
 *                           type: integer
 *                     assignments:
 *                       type: array
 *                     unassigned:
 *                       type: array
 */
router.post('/generate', verifyToken, adminOnly, schedulingController.generateSchedule);

/**
 * @swagger
 * /scheduling/schedule:
 *   delete:
 *     summary: Clear schedule for a semester (Admin only)
 *     tags: [Scheduling]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - semester
 *               - year
 *             properties:
 *               semester:
 *                 type: string
 *                 enum: [Fall, Spring, Summer]
 *               year:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Schedule cleared
 */
router.delete('/schedule', verifyToken, adminOnly, schedulingController.clearSchedule);

/**
 * @swagger
 * /scheduling/my-schedule:
 *   get:
 *     summary: Get my schedule
 *     tags: [Scheduling]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: My schedule data
 */
router.get('/my-schedule', verifyToken, schedulingController.getMySchedule);

/**
 * @swagger
 * /scheduling/my-schedule/ical:
 *   get:
 *     summary: Export my schedule to iCal (.ics)
 *     tags: [Scheduling]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: iCal file download
 *         content:
 *           text/calendar:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/my-schedule/ical', verifyToken, schedulingController.exportScheduleToIcal);

module.exports = router;
