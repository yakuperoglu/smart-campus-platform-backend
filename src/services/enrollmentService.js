/**
 * Enrollment Service
 * Handles business logic for course enrollment operations
 * Includes prerequisite checking, schedule conflict detection, and capacity management
 */

const { Op } = require('sequelize');
const {
  sequelize,
  Enrollment,
  CourseSection,
  Course,
  CoursePrerequisite,
  Student,
  Classroom
} = require('../models');
const { AppError } = require('../middleware/errorHandler');

/**
 * Calculate letter grade based on midterm and final grades
 * Uses standard Turkish university grading scale
 * Formula: 40% midterm + 60% final
 */
const calculateLetterGrade = (midterm, final) => {
  if (midterm === null || final === null) {
    return null;
  }

  const average = (midterm * 0.4) + (final * 0.6);

  if (average >= 90) return 'AA';
  if (average >= 85) return 'BA';
  if (average >= 80) return 'BB';
  if (average >= 75) return 'CB';
  if (average >= 70) return 'CC';
  if (average >= 65) return 'DC';
  if (average >= 60) return 'DD';
  if (average >= 50) return 'FD';
  return 'FF';
};

/**
 * Convert letter grade to GPA points
 */
const letterGradeToGPA = (letterGrade) => {
  const gradePoints = {
    'AA': 4.00,
    'BA': 3.50,
    'BB': 3.00,
    'CB': 2.50,
    'CC': 2.00,
    'DC': 1.50,
    'DD': 1.00,
    'FD': 0.50,
    'FF': 0.00
  };
  return gradePoints[letterGrade] || 0;
};

/**
 * Check if student has passed a course (CC or above)
 */
const hasPassedCourse = (letterGrade) => {
  const passingGrades = ['AA', 'BA', 'BB', 'CB', 'CC'];
  return passingGrades.includes(letterGrade);
};

/**
 * Recursively check prerequisites for a course
 * @param {string} courseId - The course ID to check prerequisites for
 * @param {string} studentId - The student ID
 * @param {Set} checkedCourses - Set of already checked courses to prevent infinite loops
 * @returns {Object} - { passed: boolean, missingPrerequisites: Array }
 */
const checkPrerequisitesRecursive = async (courseId, studentId, checkedCourses = new Set()) => {
  // Prevent infinite loops in case of circular dependencies
  if (checkedCourses.has(courseId)) {
    return { passed: true, missingPrerequisites: [] };
  }
  checkedCourses.add(courseId);

  // Get all prerequisites for this course
  const prerequisites = await CoursePrerequisite.findAll({
    where: { course_id: courseId },
    include: [
      {
        model: Course,
        as: 'prerequisiteCourse',
        attributes: ['id', 'code', 'name']
      }
    ]
  });

  if (prerequisites.length === 0) {
    return { passed: true, missingPrerequisites: [] };
  }

  const missingPrerequisites = [];

  for (const prereq of prerequisites) {
    const prereqCourse = prereq.prerequisiteCourse;

    // First, recursively check if the prerequisite itself has prerequisites
    const nestedCheck = await checkPrerequisitesRecursive(
      prereqCourse.id,
      studentId,
      new Set(checkedCourses)
    );

    if (!nestedCheck.passed) {
      missingPrerequisites.push(...nestedCheck.missingPrerequisites);
    }

    // Check if student has completed this prerequisite course with passing grade
    const completedEnrollment = await Enrollment.findOne({
      where: {
        student_id: studentId,
        status: 'completed'
      },
      include: [
        {
          model: CourseSection,
          as: 'section',
          where: { course_id: prereqCourse.id }
        }
      ]
    });

    if (!completedEnrollment || !hasPassedCourse(completedEnrollment.letter_grade)) {
      missingPrerequisites.push({
        course_id: prereqCourse.id,
        course_code: prereqCourse.code,
        course_name: prereqCourse.name,
        current_grade: completedEnrollment?.letter_grade || null,
        status: completedEnrollment?.status || 'not_taken'
      });
    }
  }

  return {
    passed: missingPrerequisites.length === 0,
    missingPrerequisites
  };
};

/**
 * Parse time string to minutes since midnight for comparison
 * @param {string} timeStr - Time string in HH:MM format
 * @returns {number} - Minutes since midnight
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Check if two time slots overlap
 * @param {Object} slot1 - { day, start_time, end_time }
 * @param {Object} slot2 - { day, start_time, end_time }
 * @returns {boolean}
 */
const timeSlotsOverlap = (slot1, slot2) => {
  // Different days = no overlap
  if (slot1.day !== slot2.day) {
    return false;
  }

  const start1 = timeToMinutes(slot1.start_time);
  const end1 = timeToMinutes(slot1.end_time);
  const start2 = timeToMinutes(slot2.start_time);
  const end2 = timeToMinutes(slot2.end_time);

  // Check for overlap: !(end1 <= start2 || end2 <= start1)
  return !(end1 <= start2 || end2 <= start1);
};

/**
 * Normalize schedule_json to a consistent array format
 * @param {any} scheduleJson - The schedule JSON from database
 * @returns {Array} - Array of schedule slots
 */
const normalizeSchedule = (scheduleJson) => {
  if (!scheduleJson) return [];
  if (Array.isArray(scheduleJson)) return scheduleJson;
  return [scheduleJson];
};

/**
 * Check for schedule conflicts between a new section and existing enrollments
 * @param {string} studentId - The student ID
 * @param {string} newSectionId - The new section to check
 * @returns {Object} - { hasConflict: boolean, conflicts: Array }
 */
const checkScheduleConflicts = async (studentId, newSectionId) => {
  // Get the new section's schedule
  const newSection = await CourseSection.findByPk(newSectionId, {
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['code', 'name']
      }
    ]
  });

  if (!newSection) {
    throw new AppError('Section not found', 404, 'SECTION_NOT_FOUND');
  }

  let newSchedule = newSection.schedule_json || [];

  if (!Array.isArray(newSchedule)) {
    newSchedule = [newSchedule];
  }

  if (newSchedule.length === 0) {
    // No schedule defined, no conflicts possible
    return { hasConflict: false, conflicts: [] };
  }

  // Get all active enrollments for the student
  const existingEnrollments = await Enrollment.findAll({
    where: {
      student_id: studentId,
      status: 'enrolled'
    },
    include: [
      {
        model: CourseSection,
        as: 'section',
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['code', 'name']
          }
        ]
      }
    ]
  });

  const conflicts = [];

  for (const enrollment of existingEnrollments) {
    // Safety check for orphaned records
    if (!enrollment.section) continue;

    const existingSchedule = normalizeSchedule(enrollment.section.schedule_json);

    for (const newSlot of newSchedule) {
      for (const existingSlot of existingSchedule) {
        if (timeSlotsOverlap(newSlot, existingSlot)) {
          conflicts.push({
            existing_course: {
              code: enrollment.section.course.code,
              name: enrollment.section.course.name,
              section_id: enrollment.section.id
            },
            new_course: {
              code: newSection.course.code,
              name: newSection.course.name,
              section_id: newSection.id
            },
            conflict_day: newSlot.day,
            new_slot: {
              start_time: newSlot.start_time,
              end_time: newSlot.end_time
            },
            existing_slot: {
              start_time: existingSlot.start_time,
              end_time: existingSlot.end_time
            }
          });
        }
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
};

/**
 * Enroll a student in a course section with all validations
 * Uses database transaction to ensure atomicity
 * @param {string} studentId - The student ID
 * @param {string} sectionId - The section ID
 * @returns {Object} - The created enrollment
 */
const enrollStudent = async (studentId, sectionId) => {
  // Start a transaction for atomic operations
  const transaction = await sequelize.transaction();

  try {
    // 1. Verify student exists
    const student = await Student.findByPk(studentId, { transaction });
    if (!student) {
      throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
    }

    // 2. Verify section exists and get course info
    const section = await CourseSection.findByPk(sectionId, {
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'code', 'name', 'credits']
        }
      ],
      transaction
    });

    if (!section) {
      throw new AppError('Section not found', 404, 'SECTION_NOT_FOUND');
    }

    // 3. Check if already enrolled in this section or same course
    const existingEnrollment = await Enrollment.findOne({
      where: {
        student_id: studentId,
        section_id: sectionId,
        status: { [Op.in]: ['enrolled', 'completed'] }
      },
      transaction
    });

    if (existingEnrollment) {
      throw new AppError(
        'Already enrolled in this section',
        400,
        'ALREADY_ENROLLED'
      );
    }

    // Check if enrolled in another section of the same course
    const enrolledInSameCourse = await Enrollment.findOne({
      where: {
        student_id: studentId,
        status: 'enrolled'
      },
      include: [
        {
          model: CourseSection,
          as: 'section',
          where: { course_id: section.course.id }
        }
      ],
      transaction
    });

    if (enrolledInSameCourse) {
      throw new AppError(
        'Already enrolled in another section of this course',
        400,
        'ALREADY_ENROLLED_IN_COURSE'
      );
    }

    // 4. PREREQUISITE CHECK (Recursive)
    const prereqCheck = await checkPrerequisitesRecursive(
      section.course.id,
      studentId
    );

    if (!prereqCheck.passed) {
      throw new AppError(
        'Prerequisites not met',
        400,
        'PREREQUISITES_NOT_MET',
        { missingPrerequisites: prereqCheck.missingPrerequisites }
      );
    }

    // 5. SCHEDULE CONFLICT CHECK
    const conflictCheck = await checkScheduleConflicts(studentId, sectionId);

    if (conflictCheck.hasConflict) {
      throw new AppError(
        'Schedule conflict detected',
        400,
        'SCHEDULE_CONFLICT',
        { conflicts: conflictCheck.conflicts }
      );
    }

    // 6. CAPACITY CHECK with Atomic Update (Race Condition Prevention)
    // Use optimistic locking with WHERE clause to prevent race conditions
    const [updatedCount] = await CourseSection.update(
      {
        enrolled_count: sequelize.literal('enrolled_count + 1')
      },
      {
        where: {
          id: sectionId,
          enrolled_count: { [Op.lt]: sequelize.col('capacity') }
        },
        transaction
      }
    );

    if (updatedCount === 0) {
      // Either section doesn't exist or capacity is full
      const currentSection = await CourseSection.findByPk(sectionId, { transaction });
      if (currentSection && currentSection.enrolled_count >= currentSection.capacity) {
        throw new AppError(
          `Section is full (${currentSection.enrolled_count}/${currentSection.capacity})`,
          400,
          'SECTION_FULL'
        );
      }
      throw new AppError('Failed to enroll', 500, 'ENROLLMENT_FAILED');
    }

    // 7. Create enrollment record
    const enrollment = await Enrollment.create(
      {
        student_id: studentId,
        section_id: sectionId,
        status: 'enrolled',
        enrollment_date: new Date()
      },
      { transaction }
    );

    // Commit transaction
    await transaction.commit();

    // Fetch complete enrollment with associations
    const completeEnrollment = await Enrollment.findByPk(enrollment.id, {
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
          model: Student,
          as: 'student'
        }
      ]
    });

    return completeEnrollment;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Drop a course (withdraw from enrollment)
 * @param {string} studentId - The student ID
 * @param {string} enrollmentId - The enrollment ID
 * @returns {Object} - Updated enrollment
 */
const dropEnrollment = async (studentId, enrollmentId) => {
  const transaction = await sequelize.transaction();

  try {
    const enrollment = await Enrollment.findOne({
      where: {
        id: enrollmentId,
        student_id: studentId,
        status: 'enrolled'
      },
      include: [
        {
          model: CourseSection,
          as: 'section'
        }
      ],
      transaction
    });

    if (!enrollment) {
      throw new AppError(
        'Enrollment not found or already dropped/completed',
        404,
        'ENROLLMENT_NOT_FOUND'
      );
    }

    // Update enrollment status
    await enrollment.update({ status: 'dropped' }, { transaction });

    // Decrease enrolled count
    await CourseSection.update(
      {
        enrolled_count: sequelize.literal('GREATEST(enrolled_count - 1, 0)')
      },
      {
        where: { id: enrollment.section_id },
        transaction
      }
    );

    await transaction.commit();

    return enrollment;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Update grades for an enrollment
 * Automatically calculates letter grade when both midterm and final are provided
 * @param {string} enrollmentId - The enrollment ID
 * @param {Object} grades - { midterm_grade, final_grade }
 * @param {string} instructorId - The instructor making the update (for authorization)
 * @returns {Object} - Updated enrollment with calculated letter grade
 */
const updateGrades = async (enrollmentId, grades, instructorId) => {
  const transaction = await sequelize.transaction();

  try {
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
          model: Student,
          as: 'student'
        }
      ],
      transaction
    });

    if (!enrollment) {
      throw new AppError('Enrollment not found', 404, 'ENROLLMENT_NOT_FOUND');
    }

    // Verify instructor is teaching this section (if instructorId provided)
    if (instructorId && enrollment.section.instructor_id !== instructorId) {
      throw new AppError(
        'You are not authorized to grade this section',
        403,
        'NOT_SECTION_INSTRUCTOR'
      );
    }

    // Prepare update data
    const updateData = {};

    if (grades.midterm_grade !== undefined) {
      if (grades.midterm_grade < 0 || grades.midterm_grade > 100) {
        throw new AppError('Midterm grade must be between 0 and 100', 400, 'INVALID_GRADE');
      }
      updateData.midterm_grade = grades.midterm_grade;
    }

    if (grades.final_grade !== undefined) {
      if (grades.final_grade < 0 || grades.final_grade > 100) {
        throw new AppError('Final grade must be between 0 and 100', 400, 'INVALID_GRADE');
      }
      updateData.final_grade = grades.final_grade;
    }

    // Get current grades (merge with new ones)
    const midterm = grades.midterm_grade !== undefined
      ? grades.midterm_grade
      : enrollment.midterm_grade;
    const final = grades.final_grade !== undefined
      ? grades.final_grade
      : enrollment.final_grade;

    // Calculate letter grade if both grades are available
    if (midterm !== null && final !== null) {
      updateData.letter_grade = calculateLetterGrade(
        parseFloat(midterm),
        parseFloat(final)
      );

      // Determine if passed or failed
      if (hasPassedCourse(updateData.letter_grade)) {
        updateData.status = 'completed';
      } else {
        updateData.status = 'failed';
      }
    }

    // Update enrollment
    await enrollment.update(updateData, { transaction });

    await transaction.commit();

    // Fetch updated enrollment
    const updatedEnrollment = await Enrollment.findByPk(enrollmentId, {
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
          model: Student,
          as: 'student'
        }
      ]
    });

    return updatedEnrollment;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get student's current enrollments
 * @param {string} studentId - The student ID
 * @param {Object} options - Filter options (status, semester, year)
 * @returns {Array} - List of enrollments
 */
const getStudentEnrollments = async (studentId, options = {}) => {
  const where = { student_id: studentId };

  if (options.status) {
    where.status = options.status;
  }

  const include = [
    {
      model: CourseSection,
      as: 'section',
      include: [
        {
          model: Course,
          as: 'course'
        },
        {
          model: Classroom,
          as: 'classroom'
        }
      ]
    }
  ];

  if (options.semester || options.year) {
    include[0].where = {};
    if (options.semester) include[0].where.semester = options.semester;
    if (options.year) include[0].where.year = options.year;
  }

  const enrollments = await Enrollment.findAll({
    where,
    include,
    order: [['enrollment_date', 'DESC']]
  });

  return enrollments;
};

/**
 * Get section enrollments (for instructors)
 * @param {string} sectionId - The section ID
 * @param {string} instructorId - The instructor ID (for authorization)
 * @returns {Array} - List of enrollments
 */
const getSectionEnrollments = async (sectionId, instructorId = null) => {
  const section = await CourseSection.findByPk(sectionId);

  if (!section) {
    throw new AppError('Section not found', 404, 'SECTION_NOT_FOUND');
  }

  // Verify instructor if provided
  if (instructorId && section.instructor_id !== instructorId) {
    throw new AppError(
      'You are not authorized to view this section',
      403,
      'NOT_SECTION_INSTRUCTOR'
    );
  }

  const enrollments = await Enrollment.findAll({
    where: {
      section_id: sectionId,
      status: { [Op.in]: ['enrolled', 'completed', 'failed'] }
    },
    include: [
      {
        model: Student,
        as: 'student',
        include: [
          {
            model: require('../models/User'),
            as: 'user',
            attributes: ['email', 'profile_picture_url']
          }
        ]
      }
    ],
    order: [['enrollment_date', 'ASC']]
  });

  return enrollments;
};

/**
 * Bulk update grades for a section
 * @param {string} sectionId - The section ID
 * @param {Array} gradesArray - Array of { enrollment_id, midterm_grade, final_grade }
 * @param {string} instructorId - The instructor ID
 * @returns {Object} - Summary of updates
 */
const bulkUpdateGrades = async (sectionId, gradesArray, instructorId) => {
  const section = await CourseSection.findByPk(sectionId);

  if (!section) {
    throw new AppError('Section not found', 404, 'SECTION_NOT_FOUND');
  }

  if (section.instructor_id !== instructorId) {
    throw new AppError(
      'You are not authorized to grade this section',
      403,
      'NOT_SECTION_INSTRUCTOR'
    );
  }

  const results = {
    successful: [],
    failed: []
  };

  for (const gradeData of gradesArray) {
    try {
      const updated = await updateGrades(
        gradeData.enrollment_id,
        {
          midterm_grade: gradeData.midterm_grade,
          final_grade: gradeData.final_grade
        },
        instructorId
      );
      results.successful.push({
        enrollment_id: gradeData.enrollment_id,
        letter_grade: updated.letter_grade
      });
    } catch (error) {
      results.failed.push({
        enrollment_id: gradeData.enrollment_id,
        error: error.message
      });
    }
  }

  return results;
};

module.exports = {
  enrollStudent,
  dropEnrollment,
  updateGrades,
  getStudentEnrollments,
  getSectionEnrollments,
  bulkUpdateGrades,
  checkPrerequisitesRecursive,
  checkScheduleConflicts,
  calculateLetterGrade,
  letterGradeToGPA,
  hasPassedCourse
};

