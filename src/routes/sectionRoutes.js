/**
 * Section Routes
 * API endpoints for course section management (for instructors)
 */

const express = require('express');
const router = express.Router();

const enrollmentController = require('../controllers/enrollmentController');
const { verifyToken } = require('../middleware/authMiddleware');
const { authorize, facultyOrAdmin } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validate');
const {
  sectionIdValidator,
  bulkUpdateGradesValidator
} = require('../validators/enrollmentValidators');

/**
 * @swagger
 * /sections/{sectionId}/enrollments:
 *   get:
 *     summary: Get section enrollments
 *     description: Get all students enrolled in a course section (for instructors)
 *     tags: [Sections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of enrolled students with grades
 *       403:
 *         description: Not section instructor
 */
router.get(
  '/:sectionId/enrollments',
  verifyToken,
  facultyOrAdmin,
  sectionIdValidator,
  validate,
  enrollmentController.getSectionEnrollments
);

/**
 * @swagger
 * /sections/{sectionId}/grades:
 *   post:
 *     summary: Bulk update grades
 *     description: |
 *       Update grades for multiple students in a section at once.
 *       Automatically calculates letter grades when both midterm and final are provided.
 *     tags: [Sections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               grades:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     enrollment_id:
 *                       type: string
 *                       format: uuid
 *                     midterm_grade:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *                     final_grade:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 100
 *     responses:
 *       200:
 *         description: Grades updated with auto-calculated letter grades
 */
router.post(
  '/:sectionId/grades',
  verifyToken,
  authorize('faculty'),
  bulkUpdateGradesValidator,
  validate,
  enrollmentController.bulkUpdateGrades
);

module.exports = router;

