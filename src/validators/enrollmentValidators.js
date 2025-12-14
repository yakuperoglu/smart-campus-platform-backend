/**
 * Enrollment Validators
 * Request validation schemas for enrollment operations
 */

const { body, param, query } = require('express-validator');

/**
 * Validate enrollment creation request
 */
const createEnrollmentValidator = [
  body('section_id')
    .notEmpty()
    .withMessage('Section ID is required')
    .isUUID()
    .withMessage('Section ID must be a valid UUID')
];

/**
 * Validate enrollment ID parameter
 */
const enrollmentIdValidator = [
  param('id')
    .notEmpty()
    .withMessage('Enrollment ID is required')
    .isUUID()
    .withMessage('Enrollment ID must be a valid UUID')
];

/**
 * Validate section ID parameter
 */
const sectionIdValidator = [
  param('sectionId')
    .notEmpty()
    .withMessage('Section ID is required')
    .isUUID()
    .withMessage('Section ID must be a valid UUID')
];

/**
 * Validate course ID parameter
 */
const courseIdValidator = [
  param('courseId')
    .notEmpty()
    .withMessage('Course ID is required')
    .isUUID()
    .withMessage('Course ID must be a valid UUID')
];

/**
 * Validate grade update request
 */
const updateGradesValidator = [
  param('id')
    .notEmpty()
    .withMessage('Enrollment ID is required')
    .isUUID()
    .withMessage('Enrollment ID must be a valid UUID'),
  body('midterm_grade')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Midterm grade must be between 0 and 100'),
  body('final_grade')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Final grade must be between 0 and 100')
];

/**
 * Validate bulk grade update request
 */
const bulkUpdateGradesValidator = [
  param('sectionId')
    .notEmpty()
    .withMessage('Section ID is required')
    .isUUID()
    .withMessage('Section ID must be a valid UUID'),
  body('grades')
    .isArray({ min: 1 })
    .withMessage('Grades must be a non-empty array'),
  body('grades.*.enrollment_id')
    .notEmpty()
    .withMessage('Enrollment ID is required for each grade entry')
    .isUUID()
    .withMessage('Enrollment ID must be a valid UUID'),
  body('grades.*.midterm_grade')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Midterm grade must be between 0 and 100'),
  body('grades.*.final_grade')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Final grade must be between 0 and 100')
];

/**
 * Validate enrollment listing query parameters
 */
const listEnrollmentsValidator = [
  query('status')
    .optional()
    .isIn(['enrolled', 'dropped', 'completed', 'failed'])
    .withMessage('Invalid status value'),
  query('semester')
    .optional()
    .isIn(['Fall', 'Spring', 'Summer'])
    .withMessage('Invalid semester value'),
  query('year')
    .optional()
    .isInt({ min: 2020, max: 2100 })
    .withMessage('Year must be between 2020 and 2100')
];

module.exports = {
  createEnrollmentValidator,
  enrollmentIdValidator,
  sectionIdValidator,
  courseIdValidator,
  updateGradesValidator,
  bulkUpdateGradesValidator,
  listEnrollmentsValidator
};

