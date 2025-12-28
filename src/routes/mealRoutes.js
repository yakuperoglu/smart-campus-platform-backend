/**
 * Meal Routes
 * 
 * API endpoints for meal reservations, menus, and cafeterias.
 * 
 * @swagger
 * tags:
 *   name: Meals
 *   description: Meal reservation and menu management
 */

const express = require('express');
const router = express.Router();
const mealController = require('../controllers/mealController');
const { verifyToken, optionalAuth } = require('../middleware/authMiddleware');

// Middleware for admin/staff only
const adminOrStaff = (req, res, next) => {
    if (!['admin', 'staff', 'faculty'].includes(req.user?.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin or staff only.'
        });
    }
    next();
};

// ==================== Cafeteria Routes ====================

/**
 * @swagger
 * /meals/cafeterias:
 *   get:
 *     summary: Get all active cafeterias
 *     tags: [Meals]
 *     responses:
 *       200:
 *         description: List of cafeterias
 */
router.get('/cafeterias', mealController.getCafeterias);

// ==================== Menu Routes ====================

/**
 * @swagger
 * /meals/menus:
 *   get:
 *     summary: Get menus
 *     tags: [Meals]
 *     parameters:
 *       - in: query
 *         name: cafeteria_id
 *         schema:
 *           type: string
 *         description: Filter by cafeteria
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by specific date
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [breakfast, lunch, dinner]
 *     responses:
 *       200:
 *         description: List of menus
 */
router.get('/menus', optionalAuth, mealController.getMenus);

/**
 * @swagger
 * /meals/menus/{id}:
 *   get:
 *     summary: Get menu by ID
 *     tags: [Meals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu details
 */
router.get('/menus/:id', mealController.getMenuById);

/**
 * @swagger
 * /meals/menus:
 *   post:
 *     summary: Create a new menu (Admin/Staff only)
 *     tags: [Meals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cafeteria_id
 *               - date
 *               - type
 *             properties:
 *               cafeteria_id:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               type:
 *                 type: string
 *                 enum: [breakfast, lunch, dinner]
 *               items_json:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     category:
 *                       type: string
 *               nutritional_info_json:
 *                 type: object
 *               price:
 *                 type: number
 *               is_published:
 *                 type: boolean
 *               max_reservations:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Menu created
 */
router.post('/menus', verifyToken, adminOrStaff, mealController.createMenu);

/**
 * @swagger
 * /meals/menus/{id}:
 *   put:
 *     summary: Update a menu (Admin/Staff only)
 *     tags: [Meals]
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
 *         description: Menu updated
 */
router.put('/menus/:id', verifyToken, adminOrStaff, mealController.updateMenu);

/**
 * @swagger
 * /meals/menus/{id}:
 *   delete:
 *     summary: Delete a menu (Admin/Staff only)
 *     tags: [Meals]
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
 *         description: Menu deleted
 */
router.delete('/menus/:id', verifyToken, adminOrStaff, mealController.deleteMenu);

/**
 * @swagger
 * /meals/menus/seed:
 *   post:
 *     summary: Seed menus for the next N days (Admin/Staff only)
 *     tags: [Meals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               days:
 *                 type: integer
 *                 default: 7
 *                 minimum: 1
 *                 maximum: 30
 *     responses:
 *       201:
 *         description: Menus seeded successfully
 */
router.post('/menus/seed', verifyToken, adminOrStaff, mealController.seedMenus);

// ==================== Reservation Routes ====================

/**
 * @swagger
 * /meals/reservations:
 *   get:
 *     summary: Get user's meal reservations
 *     tags: [Meals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [reserved, confirmed, consumed, cancelled, no_show]
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
 *         description: List of reservations
 */
router.get('/reservations', verifyToken, mealController.getMyReservations);

/**
 * @swagger
 * /meals/reservations:
 *   post:
 *     summary: Create a meal reservation
 *     tags: [Meals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - menu_id
 *             properties:
 *               menu_id:
 *                 type: string
 *                 description: ID of the menu to reserve
 *     responses:
 *       201:
 *         description: Reservation created
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
 *                     reservation:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         qr_code:
 *                           type: string
 *                         status:
 *                           type: string
 */
router.post('/reservations', verifyToken, mealController.createReservation);

/**
 * @swagger
 * /meals/reservations/use:
 *   post:
 *     summary: Use/validate a reservation (scan QR code)
 *     tags: [Meals]
 *     security:
 *       - bearerAuth: []
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
 *                 description: QR code from reservation
 *     responses:
 *       200:
 *         description: Reservation validated
 */
router.post('/reservations/use', verifyToken, adminOrStaff, mealController.useReservation);

/**
 * @swagger
 * /meals/reservations/{id}:
 *   delete:
 *     summary: Cancel a reservation
 *     tags: [Meals]
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
router.delete('/reservations/:id', verifyToken, mealController.cancelReservation);

module.exports = router;
