/**
 * Event Routes
 * 
 * API endpoints for event management and registration.
 * 
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management and registration
 */

const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { verifyToken, optionalAuth } = require('../middleware/authMiddleware');

// Middleware for admin/staff/faculty only
const canManageEvents = (req, res, next) => {
    if (!['admin', 'staff', 'faculty'].includes(req.user?.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Event management requires admin, staff, or faculty role.'
        });
    }
    next();
};

// ==================== Public Event Routes ====================

/**
 * @swagger
 * /events:
 *   get:
 *     summary: Get events with filters
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
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
 *         description: List of events
 */
router.get('/', optionalAuth, eventController.getEvents);

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event details
 */
router.get('/:id', optionalAuth, eventController.getEventById);

// ==================== User Registration Routes ====================

/**
 * @swagger
 * /events/registrations:
 *   get:
 *     summary: Get user's event registrations
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [registered, waitlisted, cancelled, attended]
 *     responses:
 *       200:
 *         description: List of user's registrations
 */
router.get('/registrations', verifyToken, eventController.getMyRegistrations);

/**
 * @swagger
 * /events/{id}/register:
 *   post:
 *     summary: Register for an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       201:
 *         description: Registration successful
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
 *                     registration:
 *                       type: object
 *                     event:
 *                       type: object
 *                     payment:
 *                       type: object
 *                     waitlist:
 *                       type: object
 *       400:
 *         description: Already registered, event full, or insufficient balance
 */
router.post('/:id/register', verifyToken, eventController.registerForEvent);

/**
 * @swagger
 * /events/{id}/checkin:
 *   post:
 *     summary: Check in attendee (event managers only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qr_code
 *             properties:
 *               qr_code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Check-in successful
 */
router.post('/:id/checkin', verifyToken, canManageEvents, eventController.checkInEvent);

/**
 * @swagger
 * /events/registrations/{id}:
 *   delete:
 *     summary: Cancel a registration
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Registration ID
 *     responses:
 *       200:
 *         description: Registration cancelled
 */
router.delete('/registrations/:id', verifyToken, eventController.cancelRegistration);

// ==================== Event Management Routes (Admin/Staff) ====================

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create an event (admin/staff/faculty only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - date
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               category:
 *                 type: string
 *               is_paid:
 *                 type: boolean
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Event created
 */
router.post('/', verifyToken, canManageEvents, eventController.createEvent);

/**
 * @swagger
 * /events/{id}:
 *   put:
 *     summary: Update an event (admin/staff/faculty only)
 *     tags: [Events]
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
 *         description: Event updated
 */
router.put('/:id', verifyToken, canManageEvents, eventController.updateEvent);

/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     summary: Delete an event (admin/staff/faculty only)
 *     tags: [Events]
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
 *         description: Event deleted
 */
router.delete('/:id', verifyToken, canManageEvents, eventController.deleteEvent);

module.exports = router;
