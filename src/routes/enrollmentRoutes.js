/**
 * Enrollment Routes
 * API endpoints for course enrollment management
 */

const express = require('express');
const router = express.Router();

const enrollmentController = require('../controllers/enrollmentController');
const { verifyToken, loadUserProfile } = require('../middleware/authMiddleware');
const { authorize, studentOnly, facultyOrAdmin } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validate');
const {
  createEnrollmentValidator,
  enrollmentIdValidator,
  sectionIdValidator,
  courseIdValidator,
  updateGradesValidator,
  bulkUpdateGradesValidator,
  listEnrollmentsValidator
} = require('../validators/enrollmentValidators');

// ==================== Student Routes ====================

/**
 * @swagger
 * /enrollments:
 *   post:
 *     summary: Enroll in a course section
 *     description: |
 *       Enroll authenticated student in a course section.
 *       Performs three critical checks:
 *       1. **Prerequisite Check (Recursive)** - Verifies all prerequisites are met
 *       2. **Schedule Conflict Check** - Ensures no time conflicts with existing enrollments
 *       3. **Capacity Check (Atomic)** - Uses transaction to prevent race conditions
 *     tags: [Enrollments]
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
 *             properties:
 *               section_id:
 *                 type: string
 *                 format: uuid
 *                 description: The course section ID to enroll in
 *     responses:
 *       201:
 *         description: Successfully enrolled in the course
 *       400:
 *         description: Prerequisites not met, schedule conflict, or section full
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  '/',
  verifyToken,
  studentOnly,
  createEnrollmentValidator,
  validate,
  enrollmentController.createEnrollment
);

/**
 * @swagger
 * /enrollments:
 *   get:
 *     summary: Get my enrollments
 *     description: Get all enrollments for the authenticated student
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [enrolled, dropped, completed, failed]
 *         description: Filter by enrollment status
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *           enum: [Fall, Spring, Summer]
 *         description: Filter by semester
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year
 *     responses:
 *       200:
 *         description: List of enrollments
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/',
  verifyToken,
  studentOnly,
  listEnrollmentsValidator,
  validate,
  enrollmentController.getMyEnrollments
);

/**
 * @swagger
 * /enrollments/check-prerequisites/{courseId}:
 *   get:
 *     summary: Check prerequisites for a course
 *     description: Check if student meets all prerequisites (recursive check)
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Prerequisite check result
 */
router.get(
  '/check-prerequisites/:courseId',
  verifyToken,
  studentOnly,
  courseIdValidator,
  validate,
  enrollmentController.checkPrerequisites
);

/**
 * @route   GET /api/v1/enrollments/check-conflicts/:sectionId
 * @desc    Check schedule conflicts for a section
 * @access  Private (Student only)
 */
router.get(
  '/check-conflicts/:sectionId',
  verifyToken,
  studentOnly,
  sectionIdValidator,
  validate,
  enrollmentController.checkConflicts
);

/**
 * @route   GET /api/v1/enrollments/:id
 * @desc    Get a specific enrollment
 * @access  Private (Owner, Instructor, or Admin)
 */
router.get(
  '/:id',
  verifyToken,
  authorize('student', 'faculty', 'admin'),
  enrollmentIdValidator,
  validate,
  enrollmentController.getEnrollmentById
);

/**
 * @route   DELETE /api/v1/enrollments/:id
 * @desc    Drop a course
 * @access  Private (Student only)
 */
router.delete(
  '/:id',
  verifyToken,
  studentOnly,
  enrollmentIdValidator,
  validate,
  enrollmentController.dropEnrollment
);

// ==================== Faculty/Instructor Routes ====================

/**
 * @route   POST /api/v1/enrollments/:id/grades
 * @desc    Update grades for an enrollment
 * @access  Private (Faculty - section instructor only)
 */
router.post(
  '/:id/grades',
  verifyToken,
  authorize('faculty'),
  updateGradesValidator,
  validate,
  enrollmentController.updateGrades
);

/**
 * @route   PUT /api/v1/enrollments/:id/grades
 * @desc    Update grades for an enrollment (alternative method)
 * @access  Private (Faculty - section instructor only)
 */
router.put(
  '/:id/grades',
  verifyToken,
  authorize('faculty'),
  updateGradesValidator,
  validate,
  enrollmentController.updateGrades
);

module.exports = router;

