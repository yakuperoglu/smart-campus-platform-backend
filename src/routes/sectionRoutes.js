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
const { Faculty, CourseSection, Course, Department } = require('../models');
const { AppError } = require('../middleware/errorHandler');

/**
 * @route   GET /api/v1/sections/my-sections
 * @desc    Get all sections taught by the authenticated faculty member
 * @access  Private (Faculty only)
 */
router.get(
  '/my-sections',
  verifyToken,
  authorize('faculty'),
  async (req, res, next) => {
    try {
      const userId = req.user.id;

      // Get faculty profile
      const faculty = await Faculty.findOne({ 
        where: { user_id: userId },
        include: [{ model: Department, as: 'department' }]
      });
      
      if (!faculty) {
        return next(new AppError('Faculty profile not found', 404, 'FACULTY_NOT_FOUND'));
      }

      // Get all sections taught by this faculty
      const sections = await CourseSection.findAll({
        where: { instructor_id: faculty.id },
        include: [
          {
            model: Course,
            as: 'course',
            include: [{ model: Department, as: 'department' }]
          },
          {
            model: require('../models/Classroom'),
            as: 'classroom',
            required: false
          }
        ],
        order: [
          ['year', 'DESC'],
          ['semester', 'DESC'],
          ['section_number', 'ASC']
        ]
      });

      res.status(200).json({
        success: true,
        data: {
          count: sections.length,
          sections: sections.map(section => ({
            id: section.id,
            section_number: section.section_number,
            semester: section.semester,
            year: section.year,
            capacity: section.capacity,
            enrolled_count: section.enrolled_count,
            schedule_json: section.schedule_json,
            course: {
              id: section.course.id,
              code: section.course.code,
              name: section.course.name,
              credits: section.course.credits,
              department: section.course.department ? {
                id: section.course.department.id,
                name: section.course.department.name,
                code: section.course.department.code
              } : null
            },
            classroom: section.classroom ? {
              id: section.classroom.id,
              building: section.classroom.building,
              room_number: section.classroom.room_number,
              gps_lat: section.classroom.gps_lat,
              gps_long: section.classroom.gps_long
            } : null
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

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

