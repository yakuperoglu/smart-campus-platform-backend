/**
 * Enrollment Controller
 * Handles HTTP requests for course enrollment operations
 */

const enrollmentService = require('../services/enrollmentService');
const { Student, Faculty } = require('../models');
const { AppError } = require('../middleware/errorHandler');

/**
 * @route   POST /api/v1/enrollments
 * @desc    Enroll authenticated student in a course section
 * @access  Private (Student only)
 */
const createEnrollment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { section_id } = req.body;

    // Get student profile
    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) {
      return next(new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND'));
    }

    // Perform enrollment with all checks
    const enrollment = await enrollmentService.enrollStudent(student.id, section_id);

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in the course',
      data: {
        enrollment: {
          id: enrollment.id,
          status: enrollment.status,
          enrollment_date: enrollment.enrollment_date,
          course: {
            code: enrollment.section.course.code,
            name: enrollment.section.course.name,
            credits: enrollment.section.course.credits
          },
          section: {
            id: enrollment.section.id,
            semester: enrollment.section.semester,
            year: enrollment.section.year,
            section_number: enrollment.section.section_number,
            schedule: enrollment.section.schedule_json
          }
        }
      }
    });
  } catch (error) {
    // Handle specific enrollment errors with detailed info
    if (error.code === 'PREREQUISITES_NOT_MET') {
      return res.status(400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: {
            missingPrerequisites: error.missingPrerequisites || []
          }
        }
      });
    }

    if (error.code === 'SCHEDULE_CONFLICT') {
      return res.status(400).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: {
            conflicts: error.conflicts || []
          }
        }
      });
    }

    next(error);
  }
};

/**
 * @route   DELETE /api/v1/enrollments/:id
 * @desc    Drop a course (withdraw from enrollment)
 * @access  Private (Student only)
 */
const dropEnrollment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: enrollmentId } = req.params;

    // Get student profile
    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) {
      return next(new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND'));
    }

    const enrollment = await enrollmentService.dropEnrollment(student.id, enrollmentId);

    res.status(200).json({
      success: true,
      message: 'Successfully dropped the course',
      data: {
        enrollment: {
          id: enrollment.id,
          status: enrollment.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/enrollments/:id/grades
 * @desc    Update grades for a specific enrollment
 * @access  Private (Faculty only - must be section instructor)
 */
const updateGrades = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: enrollmentId } = req.params;
    const { midterm_grade, final_grade } = req.body;

    // Get faculty profile
    const faculty = await Faculty.findOne({ where: { user_id: userId } });
    if (!faculty) {
      return next(new AppError('Faculty profile not found', 404, 'FACULTY_NOT_FOUND'));
    }

    // Update grades
    const enrollment = await enrollmentService.updateGrades(
      enrollmentId,
      { midterm_grade, final_grade },
      faculty.id
    );

    // Calculate average for response
    let average = null;
    if (enrollment.midterm_grade !== null && enrollment.final_grade !== null) {
      average = (parseFloat(enrollment.midterm_grade) * 0.4) +
        (parseFloat(enrollment.final_grade) * 0.6);
    }

    res.status(200).json({
      success: true,
      message: 'Grades updated successfully',
      data: {
        enrollment: {
          id: enrollment.id,
          student_id: enrollment.student_id,
          midterm_grade: enrollment.midterm_grade,
          final_grade: enrollment.final_grade,
          average: average ? average.toFixed(2) : null,
          letter_grade: enrollment.letter_grade,
          status: enrollment.status,
          course: {
            code: enrollment.section.course.code,
            name: enrollment.section.course.name
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/sections/:sectionId/grades
 * @desc    Bulk update grades for a section
 * @access  Private (Faculty only - must be section instructor)
 */
const bulkUpdateGrades = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sectionId } = req.params;
    const { grades } = req.body; // Array of { enrollment_id, midterm_grade, final_grade }

    // Get faculty profile
    const faculty = await Faculty.findOne({ where: { user_id: userId } });
    if (!faculty) {
      return next(new AppError('Faculty profile not found', 404, 'FACULTY_NOT_FOUND'));
    }

    // Bulk update
    const results = await enrollmentService.bulkUpdateGrades(sectionId, grades, faculty.id);

    res.status(200).json({
      success: true,
      message: `Updated ${results.successful.length} grades, ${results.failed.length} failed`,
      data: {
        successful: results.successful,
        failed: results.failed
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/enrollments
 * @desc    Get current student's enrollments
 * @access  Private (Student only)
 */
const getMyEnrollments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, semester, year } = req.query;

    // Get student profile
    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) {
      return next(new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND'));
    }

    const enrollments = await enrollmentService.getStudentEnrollments(student.id, {
      status,
      semester,
      year: year ? parseInt(year) : undefined,
      includeClassroom: false
    });

    res.status(200).json({
      success: true,
      data: {
        count: enrollments.length,
        enrollments: enrollments.map(e => ({
          id: e.id,
          status: e.status,
          enrollment_date: e.enrollment_date,
          midterm_grade: e.midterm_grade,
          final_grade: e.final_grade,
          letter_grade: e.letter_grade,
          course: {
            code: e.section.course.code,
            name: e.section.course.name,
            credits: e.section.course.credits,
            ects: e.section.course.ects
          },
          section: {
            id: e.section.id,
            semester: e.section.semester,
            year: e.section.year,
            section_number: e.section.section_number,
            schedule: e.section.schedule_json,
            classroom: e.section.classroom ? {
              building: e.section.classroom.building,
              room_number: e.section.classroom.room_number
            } : null
          }
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/enrollments/:id
 * @desc    Get a specific enrollment by ID
 * @access  Private (Student - own enrollment, Faculty - sections they teach, Admin)
 */
const getEnrollmentById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id: enrollmentId } = req.params;

    const { Enrollment, CourseSection, Course, Student: StudentModel, User } = require('../models');

    const enrollment = await Enrollment.findByPk(enrollmentId, {
      include: [
        {
          model: CourseSection,
          as: 'section',
          include: [
            {
              model: Course,
              as: 'course'
            }
          ]
        },
        {
          model: StudentModel,
          as: 'student',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['email']
            }
          ]
        }
      ]
    });

    if (!enrollment) {
      return next(new AppError('Enrollment not found', 404, 'ENROLLMENT_NOT_FOUND'));
    }

    // Authorization check
    if (userRole === 'student') {
      const student = await Student.findOne({ where: { user_id: userId } });
      if (!student || enrollment.student_id !== student.id) {
        return next(new AppError('Not authorized to view this enrollment', 403, 'FORBIDDEN'));
      }
    } else if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ where: { user_id: userId } });
      if (!faculty || enrollment.section.instructor_id !== faculty.id) {
        return next(new AppError('Not authorized to view this enrollment', 403, 'FORBIDDEN'));
      }
    }
    // Admin can view all

    res.status(200).json({
      success: true,
      data: {
        enrollment: {
          id: enrollment.id,
          status: enrollment.status,
          enrollment_date: enrollment.enrollment_date,
          midterm_grade: enrollment.midterm_grade,
          final_grade: enrollment.final_grade,
          letter_grade: enrollment.letter_grade,
          student: {
            id: enrollment.student.id,
            student_number: enrollment.student.student_number,
            email: enrollment.student.user.email
          },
          course: {
            code: enrollment.section.course.code,
            name: enrollment.section.course.name,
            credits: enrollment.section.course.credits
          },
          section: {
            id: enrollment.section.id,
            semester: enrollment.section.semester,
            year: enrollment.section.year,
            section_number: enrollment.section.section_number
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/sections/:sectionId/enrollments
 * @desc    Get all enrollments for a section (for instructors)
 * @access  Private (Faculty - section instructor, Admin)
 */
const getSectionEnrollments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { sectionId } = req.params;

    let instructorId = null;
    if (userRole === 'faculty') {
      const faculty = await Faculty.findOne({ where: { user_id: userId } });
      if (!faculty) {
        return next(new AppError('Faculty profile not found', 404, 'FACULTY_NOT_FOUND'));
      }
      instructorId = faculty.id;
    }
    // Admin can view without instructor check

    const enrollments = await enrollmentService.getSectionEnrollments(
      sectionId,
      userRole === 'admin' ? null : instructorId
    );

    res.status(200).json({
      success: true,
      data: {
        section_id: sectionId,
        count: enrollments.length,
        enrollments: enrollments.map(e => ({
          id: e.id,
          status: e.status,
          enrollment_date: e.enrollment_date,
          midterm_grade: e.midterm_grade,
          final_grade: e.final_grade,
          letter_grade: e.letter_grade,
          student: {
            id: e.student.id,
            student_number: e.student.student_number,
            email: e.student.user?.email,
            gpa: e.student.gpa
          }
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/enrollments/check-prerequisites/:courseId
 * @desc    Check if student meets prerequisites for a course
 * @access  Private (Student only)
 */
const checkPrerequisites = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.params;

    // Get student profile
    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) {
      return next(new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND'));
    }

    const result = await enrollmentService.checkPrerequisitesRecursive(courseId, student.id);

    res.status(200).json({
      success: true,
      data: {
        course_id: courseId,
        prerequisites_met: result.passed,
        missing_prerequisites: result.missingPrerequisites
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/enrollments/check-conflicts/:sectionId
 * @desc    Check if enrolling in a section would cause schedule conflicts
 * @access  Private (Student only)
 */
const checkConflicts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sectionId } = req.params;

    // Get student profile
    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) {
      return next(new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND'));
    }

    const result = await enrollmentService.checkScheduleConflicts(student.id, sectionId);

    res.status(200).json({
      success: true,
      data: {
        section_id: sectionId,
        has_conflicts: result.hasConflict,
        conflicts: result.conflicts
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEnrollment,
  dropEnrollment,
  updateGrades,
  bulkUpdateGrades,
  getMyEnrollments,
  getEnrollmentById,
  getSectionEnrollments,
  checkPrerequisites,
  checkConflicts
};

