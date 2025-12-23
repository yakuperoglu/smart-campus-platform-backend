/**
 * Reservation Routes
 * 
 * API endpoints for classroom reservations.
 * 
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Classroom reservation management
 */

const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { verifyToken } = require('../middleware/authMiddleware');

// Middleware for admin/staff only
const adminOrStaff = (req, res, next) => {
    if (!['admin', 'staff'].includes(req.user?.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin or staff privileges required.'
        });
    }
    next();
};

// ==================== Public/User Routes ====================

/**
 * @swagger
 * /reservations/classrooms:
 *   get:
 *     summary: Get all classrooms with availability summary
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of classrooms with availability
 */
router.get('/classrooms', verifyToken, reservationController.getClassroomsWithAvailability);

/**
 * @swagger
 * /reservations/availability/{classroomId}:
 *   get:
 *     summary: Get classroom availability for a date
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classroomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Classroom availability details
 */
router.get('/availability/:classroomId', verifyToken, reservationController.getClassroomAvailability);

/**
 * @swagger
 * /reservations:
 *   get:
 *     summary: Get user's reservations
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, cancelled]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of user's reservations
 */
router.get('/', verifyToken, reservationController.getMyReservations);

/**
 * @swagger
 * /reservations:
 *   post:
 *     summary: Request a classroom reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - classroom_id
 *               - date
 *               - start_time
 *               - end_time
 *               - title
 *               - purpose
 *             properties:
 *               classroom_id:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               start_time:
 *                 type: string
 *                 example: "14:00"
 *               end_time:
 *                 type: string
 *                 example: "16:00"
 *               title:
 *                 type: string
 *               purpose:
 *                 type: string
 *                 enum: [class, meeting, event, study, exam, other]
 *               description:
 *                 type: string
 *               attendee_count:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Reservation request created
 *       409:
 *         description: Conflict with existing schedule or reservation
 */
router.post('/', verifyToken, reservationController.requestReservation);

/**
 * @swagger
 * /reservations/{id}:
 *   delete:
 *     summary: Cancel a reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation cancelled
 */
router.delete('/:id', verifyToken, reservationController.cancelReservation);

// ==================== Admin Routes ====================

/**
 * @swagger
 * /reservations/pending:
 *   get:
 *     summary: Get all pending reservations (Admin only)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending reservations
 */
router.get('/pending', verifyToken, adminOrStaff, reservationController.getPendingReservations);

/**
 * @swagger
 * /reservations/{id}/approve:
 *   post:
 *     summary: Approve a reservation (Admin only)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation approved
 */
router.post('/:id/approve', verifyToken, adminOrStaff, reservationController.approveReservation);

/**
 * @swagger
 * /reservations/{id}/reject:
 *   post:
 *     summary: Reject a reservation (Admin only)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reservation rejected
 */
router.post('/:id/reject', verifyToken, adminOrStaff, reservationController.rejectReservation);

module.exports = router;
