/**
 * Course Routes
 * API endpoints for course browsing and management
 */

const express = require('express');
const router = express.Router();
const { param, query, body } = require('express-validator');

const courseController = require('../controllers/courseController');
const { verifyToken } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validate');

// ============================================
// PUBLIC/STUDENT ENDPOINTS
// ============================================

/**
 * @swagger
 * /courses:
 *   get:
 *     summary: List all courses with sections
 *     description: |
 *       Get all courses with their available sections.
 *       Supports filtering by semester, year, department, and search term.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Filter by academic year
 *       - in: query
 *         name: department_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by department
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by course code or name
 *     responses:
 *       200:
 *         description: List of courses with sections
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
    '/',
    verifyToken,
    [
        query('semester').optional().isIn(['Fall', 'Spring', 'Summer']),
        query('year').optional().isInt({ min: 2020, max: 2100 }),
        query('department_id').optional().isUUID(),
        query('search').optional().isString().trim(),
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 })
    ],
    validate,
    courseController.getCourses
);

/**
 * @swagger
 * /courses/{courseId}:
 *   get:
 *     summary: Get course details
 *     description: Get detailed information about a specific course
 *     tags: [Courses]
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
 *         description: Course details
 *       404:
 *         description: Course not found
 */
router.get(
    '/:courseId',
    verifyToken,
    [
        param('courseId').isUUID().withMessage('Invalid course ID format')
    ],
    validate,
    courseController.getCourseById
);

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * @swagger
 * /courses:
 *   post:
 *     summary: Create a new course
 *     description: Create a new course (Admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *             properties:
 *               code:
 *                 type: string
 *                 example: "CE101"
 *               name:
 *                 type: string
 *                 example: "Introduction to Programming"
 *               description:
 *                 type: string
 *               credits:
 *                 type: integer
 *                 default: 3
 *               ects:
 *                 type: integer
 *               department_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Course created successfully
 *       400:
 *         description: Duplicate course code
 *       403:
 *         description: Admin access required
 */
router.post(
    '/',
    verifyToken,
    adminOnly,
    [
        body('code').notEmpty().withMessage('Course code is required').isLength({ max: 50 }),
        body('name').notEmpty().withMessage('Course name is required').isLength({ max: 255 }),
        body('description').optional().isString(),
        body('credits').optional().isInt({ min: 0, max: 10 }),
        body('ects').optional().isInt({ min: 0, max: 15 }),
        body('department_id').optional().isUUID()
    ],
    validate,
    courseController.createCourse
);

/**
 * @swagger
 * /courses/{courseId}:
 *   put:
 *     summary: Update a course
 *     description: Update course details (Admin only)
 *     tags: [Courses]
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
 *         description: Course updated successfully
 *       404:
 *         description: Course not found
 */
router.put(
    '/:courseId',
    verifyToken,
    adminOnly,
    [
        param('courseId').isUUID().withMessage('Invalid course ID'),
        body('code').optional().isLength({ max: 50 }),
        body('name').optional().isLength({ max: 255 }),
        body('description').optional().isString(),
        body('credits').optional().isInt({ min: 0, max: 10 }),
        body('ects').optional().isInt({ min: 0, max: 15 }),
        body('department_id').optional().isUUID()
    ],
    validate,
    courseController.updateCourse
);

/**
 * @swagger
 * /courses/{courseId}:
 *   delete:
 *     summary: Delete a course
 *     description: Soft delete a course (Admin only)
 *     tags: [Courses]
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
 *         description: Course deleted successfully
 *       404:
 *         description: Course not found
 */
router.delete(
    '/:courseId',
    verifyToken,
    adminOnly,
    [
        param('courseId').isUUID().withMessage('Invalid course ID')
    ],
    validate,
    courseController.deleteCourse
);

// ============================================
// SECTION MANAGEMENT (Admin only)
// ============================================

/**
 * @swagger
 * /courses/{courseId}/sections:
 *   post:
 *     summary: Create a section for a course
 *     description: Create a new section for a course (Admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
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
 *             required:
 *               - semester
 *               - year
 *             properties:
 *               semester:
 *                 type: string
 *                 enum: [Fall, Spring, Summer]
 *               year:
 *                 type: integer
 *                 example: 2024
 *               section_number:
 *                 type: string
 *                 default: "01"
 *               capacity:
 *                 type: integer
 *                 default: 30
 *               schedule_json:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: string
 *                     start_time:
 *                       type: string
 *                     end_time:
 *                       type: string
 *     responses:
 *       201:
 *         description: Section created successfully
 *       400:
 *         description: Duplicate section
 *       404:
 *         description: Course not found
 */
router.post(
    '/:courseId/sections',
    verifyToken,
    adminOnly,
    [
        param('courseId').isUUID().withMessage('Invalid course ID'),
        body('semester').notEmpty().isIn(['Fall', 'Spring', 'Summer']).withMessage('Valid semester required'),
        body('year').notEmpty().isInt({ min: 2020, max: 2100 }).withMessage('Valid year required'),
        body('section_number').optional().isString().isLength({ max: 10 }),
        body('capacity').optional().isInt({ min: 1 }),
        body('schedule_json').optional().isArray(),
        body('classroom_id').optional().isUUID()
    ],
    validate,
    courseController.createSection
);

/**
 * @swagger
 * /courses/{courseId}/sections/{sectionId}:
 *   put:
 *     summary: Update a section
 *     description: Update section details (Admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Section updated successfully
 *       404:
 *         description: Section not found
 */
router.put(
    '/:courseId/sections/:sectionId',
    verifyToken,
    adminOnly,
    [
        param('courseId').isUUID().withMessage('Invalid course ID'),
        param('sectionId').isUUID().withMessage('Invalid section ID'),
        body('semester').optional().isIn(['Fall', 'Spring', 'Summer']),
        body('year').optional().isInt({ min: 2020, max: 2100 }),
        body('section_number').optional().isString().isLength({ max: 10 }),
        body('capacity').optional().isInt({ min: 1 }),
        body('schedule_json').optional().isArray(),
        body('classroom_id').optional().isUUID(),
        body('instructor_id').optional().isUUID()
    ],
    validate,
    courseController.updateSection
);

/**
 * @swagger
 * /courses/{courseId}/sections/{sectionId}:
 *   delete:
 *     summary: Delete a section
 *     description: Delete a section (Admin only). Cannot delete sections with enrolled students.
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Section deleted successfully
 *       400:
 *         description: Cannot delete section with enrolled students
 *       404:
 *         description: Section not found
 */
router.delete(
    '/:courseId/sections/:sectionId',
    verifyToken,
    adminOnly,
    [
        param('courseId').isUUID().withMessage('Invalid course ID'),
        param('sectionId').isUUID().withMessage('Invalid section ID')
    ],
    validate,
    courseController.deleteSection
);

module.exports = router;

