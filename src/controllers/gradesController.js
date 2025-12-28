/**
 * Grades Controller
 * Handles HTTP requests for grade operations and transcript generation
 */

const { Student, Enrollment, CourseSection, Course } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const transcriptService = require('../services/transcriptService');
const enrollmentService = require('../services/enrollmentService');

/**
 * @route   GET /api/v1/grades/transcript/pdf
 * @desc    Generate and download PDF transcript for authenticated student
 * @access  Private (Student only)
 */
const downloadTranscriptPDF = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get student profile
    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) {
      return next(new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND'));
    }

    // Generate PDF
    const pdfDoc = await transcriptService.generateTranscriptPDF(student.id);

    // Set response headers for PDF download
    const filename = `transcript_${student.student_number}_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Pipe PDF to response
    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/grades/transcript
 * @desc    Get transcript data as JSON for authenticated student
 * @access  Private (Student only)
 */
const getTranscript = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get student profile
    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) {
      return next(new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND'));
    }

    // Get transcript data
    const transcriptData = await transcriptService.getStudentTranscriptData(student.id);

    res.status(200).json({
      success: true,
      data: transcriptData
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/grades
 * @desc    Get all grades for authenticated student
 * @access  Private (Student only)
 */
const getMyGrades = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { semester, year } = req.query;

    // Get student profile
    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) {
      return next(new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND'));
    }

    // Build query options
    const options = {};
    if (semester) options.semester = semester;
    if (year) options.year = parseInt(year);

    // Get enrollments with grades
    const enrollments = await enrollmentService.getStudentEnrollments(student.id, {
      ...options,
      includeClassroom: false
    });

    // Format response
    const grades = enrollments
      .filter(e => e.letter_grade !== null)
      .map(e => ({
        id: e.id,
        course: {
          code: e.section.course.code,
          name: e.section.course.name,
          credits: e.section.course.credits,
          ects: e.section.course.ects
        },
        section: {
          semester: e.section.semester,
          year: e.section.year,
          section_number: e.section.section_number
        },
        grades: {
          midterm: e.midterm_grade,
          final: e.final_grade,
          letter: e.letter_grade,
          points: enrollmentService.letterGradeToGPA(e.letter_grade),
          passed: enrollmentService.hasPassedCourse(e.letter_grade)
        },
        status: e.status
      }));

    // Calculate current GPA
    let totalCredits = 0;
    let totalPoints = 0;

    grades.forEach(g => {
      const credits = g.course.credits || 0;
      totalCredits += credits;
      totalPoints += credits * g.grades.points;
    });

    const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

    res.status(200).json({
      success: true,
      data: {
        student: {
          student_number: student.student_number,
          gpa: student.gpa,
          cgpa: student.cgpa
        },
        current_calculation: {
          total_credits: totalCredits,
          calculated_gpa: parseFloat(gpa)
        },
        grades_count: grades.length,
        grades
      }
    });

  } catch (error) {
    console.error('Error in getMyGrades:', error);
    next(error);
  }
};

/**
 * @route   GET /api/v1/grades/summary
 * @desc    Get grade summary with GPA by semester
 * @access  Private (Student only)
 */
const getGradeSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get student profile
    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) {
      return next(new AppError('Student profile not found', 404, 'STUDENT_NOT_FOUND'));
    }

    // Get transcript data (includes semester breakdown)
    const transcriptData = await transcriptService.getStudentTranscriptData(student.id);

    // Create semester summary
    const semesterSummary = transcriptData.semesters.map(sem => ({
      semester: sem.semester,
      year: sem.year,
      courses_taken: sem.courses.length,
      credits_earned: sem.semesterCredits,
      gpa: parseFloat(sem.gpa),
      courses: sem.courses.map(c => ({
        code: c.code,
        name: c.name,
        letter_grade: c.letterGrade,
        passed: enrollmentService.hasPassedCourse(c.letterGrade)
      }))
    }));

    // Grade distribution
    const gradeDistribution = {};
    transcriptData.semesters.forEach(sem => {
      sem.courses.forEach(course => {
        const grade = course.letterGrade;
        gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
      });
    });

    res.status(200).json({
      success: true,
      data: {
        student: {
          student_number: student.student_number,
          department: transcriptData.student.department,
          faculty: transcriptData.student.faculty
        },
        summary: transcriptData.summary,
        grade_distribution: gradeDistribution,
        semesters: semesterSummary
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/grades/students/:studentId/transcript/pdf
 * @desc    Generate PDF transcript for a specific student (Admin only)
 * @access  Private (Admin only)
 */
const downloadStudentTranscriptPDF = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Verify student exists
    const student = await Student.findByPk(studentId);
    if (!student) {
      return next(new AppError('Student not found', 404, 'STUDENT_NOT_FOUND'));
    }

    // Generate PDF
    const pdfDoc = await transcriptService.generateTranscriptPDF(studentId);

    // Set response headers for PDF download
    const filename = `transcript_${student.student_number}_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Pipe PDF to response
    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (error) {
    next(error);
  }
};

module.exports = {
  downloadTranscriptPDF,
  getTranscript,
  getMyGrades,
  getGradeSummary,
  downloadStudentTranscriptPDF
};

