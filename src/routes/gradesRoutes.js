/**
 * Grades Routes
 * API endpoints for grade viewing and transcript generation
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Grade:
 *       type: object
 *       properties:
 *         midterm:
 *           type: number
 *           example: 85
 *         final:
 *           type: number
 *           example: 90
 *         letter:
 *           type: string
 *           enum: [AA, BA, BB, CB, CC, DC, DD, FD, FF]
 *           example: AA
 *         points:
 *           type: number
 *           example: 4.0
 *     TranscriptSemester:
 *       type: object
 *       properties:
 *         semester:
 *           type: string
 *           enum: [Fall, Spring, Summer]
 *         year:
 *           type: integer
 *         gpa:
 *           type: number
 *         courses:
 *           type: array
 *           items:
 *             type: object
 */

const express = require('express');
const router = express.Router();

const gradesController = require('../controllers/gradesController');
const { verifyToken } = require('../middleware/authMiddleware');
const { authorize, studentOnly, adminOnly } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validate');
const { param, query } = require('express-validator');

/**
 * Student-only routes
 */

/**
 * @swagger
 * /grades:
 *   get:
 *     summary: Get my grades
 *     description: Get all grades for the authenticated student
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *           enum: [Fall, Spring, Summer]
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of grades with GPA calculation
 */
router.get(
  '/',
  verifyToken,
  studentOnly,
  [
    query('semester')
      .optional()
      .isIn(['Fall', 'Spring', 'Summer'])
      .withMessage('Invalid semester value'),
    query('year')
      .optional()
      .isInt({ min: 2020, max: 2100 })
      .withMessage('Year must be between 2020 and 2100')
  ],
  validate,
  gradesController.getMyGrades
);

/**
 * @swagger
 * /grades/summary:
 *   get:
 *     summary: Get grade summary
 *     description: Get grade summary with GPA breakdown by semester
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Grade summary with statistics
 */
router.get(
  '/summary',
  verifyToken,
  studentOnly,
  gradesController.getGradeSummary
);

/**
 * @swagger
 * /grades/transcript:
 *   get:
 *     summary: Get transcript data (JSON)
 *     description: Get complete transcript data as JSON for display in frontend
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transcript data with all semesters and courses
 */
router.get(
  '/transcript',
  verifyToken,
  studentOnly,
  gradesController.getTranscript
);

/**
 * @swagger
 * /grades/transcript/pdf:
 *   get:
 *     summary: Download transcript as PDF
 *     description: |
 *       Generate and download official academic transcript as PDF.
 *       
 *       **Includes:**
 *       - Student information
 *       - All completed courses with grades
 *       - Semester-by-semester breakdown
 *       - GPA and CGPA calculations
 *       - Official document formatting
 *     tags: [Grades]
 *     security:
 *       - bearerAuth: []
 *     produces:
 *       - application/pdf
 *     responses:
 *       200:
 *         description: PDF transcript file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  '/transcript/pdf',
  verifyToken,
  studentOnly,
  gradesController.downloadTranscriptPDF
);

/**
 * Admin-only routes
 */

/**
 * @route   GET /api/v1/grades/students/:studentId/transcript/pdf
 * @desc    Download transcript for a specific student as PDF
 * @access  Private (Admin only)
 */
router.get(
  '/students/:studentId/transcript/pdf',
  verifyToken,
  adminOnly,
  [
    param('studentId')
      .notEmpty()
      .withMessage('Student ID is required')
      .isUUID()
      .withMessage('Student ID must be a valid UUID')
  ],
  validate,
  gradesController.downloadStudentTranscriptPDF
);

module.exports = router;

