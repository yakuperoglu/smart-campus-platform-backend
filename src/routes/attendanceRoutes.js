/**
 * Attendance Routes
 * API endpoints for GPS-based attendance management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AttendanceSession:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         session_code:
 *           type: string
 *           example: ATT-M5XK2-A1B2C3D4
 *         location:
 *           type: object
 *           properties:
 *             lat:
 *               type: number
 *               example: 41.0082
 *             lon:
 *               type: number
 *               example: 28.9784
 *             radius:
 *               type: integer
 *               example: 15
 *         timing:
 *           type: object
 *           properties:
 *             start_time:
 *               type: string
 *               format: date-time
 *             end_time:
 *               type: string
 *               format: date-time
 *     AttendanceRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           enum: [present, late, absent, excused]
 *         check_in_time:
 *           type: string
 *           format: date-time
 *         is_flagged:
 *           type: boolean
 */

const express = require('express');
const router = express.Router();

const attendanceController = require('../controllers/attendanceController');
const { verifyToken } = require('../middleware/authMiddleware');
const { authorize, studentOnly, facultyOrAdmin } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validate');
const { body, param, query } = require('express-validator');

// ==================== Faculty Routes ====================

/**
 * @swagger
 * /attendance/sessions:
 *   post:
 *     summary: Create attendance session
 *     description: |
 *       Instructor creates a new attendance session for a course section.
 *       Sets classroom location (GPS coordinates) and geofence radius.
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - section_id
 *               - lat
 *               - lon
 *             properties:
 *               section_id:
 *                 type: string
 *                 format: uuid
 *               lat:
 *                 type: number
 *                 description: Classroom latitude
 *                 example: 41.0082
 *               lon:
 *                 type: number
 *                 description: Classroom longitude
 *                 example: 28.9784
 *               radius:
 *                 type: integer
 *                 description: Geofence radius in meters (default 15)
 *                 default: 15
 *                 example: 15
 *               duration_minutes:
 *                 type: integer
 *                 description: Session duration in minutes
 *                 default: 90
 *     responses:
 *       201:
 *         description: Attendance session created
 *       400:
 *         description: Session already active
 *       403:
 *         description: Not section instructor
 */
router.post(
  '/sessions',
  verifyToken,
  authorize('faculty'),
  [
    body('section_id')
      .notEmpty()
      .withMessage('Section ID is required')
      .isUUID()
      .withMessage('Section ID must be a valid UUID'),
    body('lat')
      .notEmpty()
      .withMessage('Latitude is required')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('lon')
      .notEmpty()
      .withMessage('Longitude is required')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    body('radius')
      .optional()
      .isInt({ min: 5, max: 500 })
      .withMessage('Radius must be between 5 and 500 meters'),
    body('duration_minutes')
      .optional()
      .isInt({ min: 5, max: 480 })
      .withMessage('Duration must be between 5 and 480 minutes'),
    body('use_classroom_location')
      .optional()
      .isBoolean()
      .withMessage('use_classroom_location must be a boolean')
  ],
  validate,
  attendanceController.createSession
);

/**
 * @route   POST /api/v1/attendance/sessions/:sessionId/end
 * @desc    End an attendance session
 * @access  Private (Faculty only)
 */
router.post(
  '/sessions/:sessionId/end',
  verifyToken,
  authorize('faculty'),
  [
    param('sessionId')
      .notEmpty()
      .withMessage('Session ID is required')
      .isUUID()
      .withMessage('Session ID must be a valid UUID')
  ],
  attendanceController.endSession
);

/**
 * @route   GET /api/v1/attendance/sessions/:sessionId/records
 * @desc    Get attendance records for a session
 * @access  Private (Faculty - session owner, Admin)
 */
router.get(
  '/sessions/:sessionId/records',
  verifyToken,
  facultyOrAdmin,
  [
    param('sessionId')
      .notEmpty()
      .withMessage('Session ID is required')
      .isUUID()
      .withMessage('Session ID must be a valid UUID')
  ],
  validate,
  attendanceController.getSessionRecords
);

/**
 * @route   PUT /api/v1/attendance/sessions/:sessionId/qr
 * @desc    Rotate session QR code
 * @access  Private (Faculty only)
 */
router.put(
  '/sessions/:sessionId/qr',
  verifyToken,
  authorize('faculty'),
  [
    param('sessionId').isUUID().withMessage('Session ID must be valid UUID')
  ],
  validate,
  attendanceController.rotateSessionQrCode
);

// ==================== Student Routes ====================

/**
 * @swagger
 * /attendance/checkin:
 *   post:
 *     summary: Student check-in
 *     description: |
 *       Student checks in to an active attendance session using GPS location.
 *       
 *       **Validation:**
 *       - Uses Haversine formula to calculate distance between student and classroom
 *       - Rejects if distance > geofence radius
 *       
 *       **Spoofing Detection:**
 *       - Flags suspicious check-ins (impossible speed, low GPS accuracy, etc.)
 *       - Marked as is_flagged=true for instructor review
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lat
 *               - lon
 *             properties:
 *               session_id:
 *                 type: string
 *                 format: uuid
 *                 description: Session ID (or use session_code)
 *               session_code:
 *                 type: string
 *                 description: Session code from QR (or use session_id)
 *                 example: ATT-M5XK2-A1B2C3D4
 *               lat:
 *                 type: number
 *                 description: Student's current latitude
 *                 example: 41.0083
 *               lon:
 *                 type: number
 *                 description: Student's current longitude
 *                 example: 28.9785
 *               gps_accuracy:
 *                 type: number
 *                 description: GPS accuracy in meters
 *                 example: 5
 *     responses:
 *       200:
 *         description: Check-in successful
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
 *                     record_id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [present, late]
 *                     distance:
 *                       type: number
 *                       description: Distance from classroom in meters
 *                     is_flagged:
 *                       type: boolean
 *       400:
 *         description: Outside geofence or spoofing detected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: OUTSIDE_GEOFENCE
 *                     message:
 *                       type: string
 *                     details:
 *                       type: object
 *                       properties:
 *                         distance:
 *                           type: number
 *                         allowed_radius:
 *                           type: integer
 */
router.post(
  '/checkin',
  verifyToken,
  studentOnly,
  [
    body('session_id')
      .optional()
      .isUUID()
      .withMessage('Session ID must be a valid UUID'),
    body('session_code')
      .optional()
      .isString()
      .withMessage('Session code must be a string'),
    body('lat')
      .notEmpty()
      .withMessage('Latitude is required')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('lon')
      .notEmpty()
      .withMessage('Longitude is required')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    body('gps_accuracy')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('GPS accuracy must be a positive number')
  ],
  validate,
  attendanceController.checkIn
);

/**
 * @route   GET /api/v1/attendance/active
 * @desc    Get active attendance sessions for student
 * @access  Private (Student only)
 */
router.get(
  '/active',
  verifyToken,
  studentOnly,
  attendanceController.getActiveSessions
);

/**
 * @route   GET /api/v1/attendance/history
 * @desc    Get student's attendance history
 * @access  Private (Student only)
 */
router.get(
  '/history',
  verifyToken,
  studentOnly,
  [
    query('section_id')
      .optional()
      .isUUID()
      .withMessage('Section ID must be a valid UUID'),
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
  ],
  validate,
  attendanceController.getMyAttendanceHistory
);

// ==================== Utility Routes ====================

/**
 * @route   GET /api/v1/attendance/calculate-distance
 * @desc    Calculate distance between two GPS points
 * @access  Private (Any authenticated user)
 */
router.get(
  '/calculate-distance',
  verifyToken,
  [
    query('lat1')
      .notEmpty()
      .withMessage('lat1 is required')
      .isFloat({ min: -90, max: 90 })
      .withMessage('lat1 must be between -90 and 90'),
    query('lon1')
      .notEmpty()
      .withMessage('lon1 is required')
      .isFloat({ min: -180, max: 180 })
      .withMessage('lon1 must be between -180 and 180'),
    query('lat2')
      .notEmpty()
      .withMessage('lat2 is required')
      .isFloat({ min: -90, max: 90 })
      .withMessage('lat2 must be between -90 and 90'),
    query('lon2')
      .notEmpty()
      .withMessage('lon2 is required')
      .isFloat({ min: -180, max: 180 })
      .withMessage('lon2 must be between -180 and 180')
  ],
  validate,
  attendanceController.calculateDistance
);

// ==================== Admin/Faculty Record Management ====================

/**
 * @route   PATCH /api/v1/attendance/records/:recordId/flag
 * @desc    Update flag status of an attendance record
 * @access  Private (Faculty - session owner, Admin)
 */
router.patch(
  '/records/:recordId/flag',
  verifyToken,
  facultyOrAdmin,
  [
    param('recordId')
      .notEmpty()
      .withMessage('Record ID is required')
      .isUUID()
      .withMessage('Record ID must be a valid UUID'),
    body('is_flagged')
      .optional()
      .isBoolean()
      .withMessage('is_flagged must be a boolean'),
    body('notes')
      .optional()
      .isString()
      .withMessage('notes must be a string')
  ],
  validate,
  attendanceController.updateRecordFlag
);

/**
 * @route   PATCH /api/v1/attendance/records/:recordId/status
 * @desc    Update status of an attendance record
 * @access  Private (Faculty - session owner, Admin)
 */
router.patch(
  '/records/:recordId/status',
  verifyToken,
  facultyOrAdmin,
  [
    param('recordId')
      .notEmpty()
      .withMessage('Record ID is required')
      .isUUID()
      .withMessage('Record ID must be a valid UUID'),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['present', 'late', 'absent', 'excused'])
      .withMessage('Status must be one of: present, late, absent, excused')
  ],
  validate,
  attendanceController.updateRecordStatus
);

module.exports = router;

