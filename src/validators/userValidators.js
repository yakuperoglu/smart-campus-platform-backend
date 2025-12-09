/**
 * User Validation Schemas using Joi
 */

const Joi = require('joi');

/**
 * Update profile schema
 */
const updateProfileSchema = {
  body: Joi.object({
    // Student-specific fields
    gpa: Joi.number()
      .min(0)
      .max(4)
      .optional()
      .messages({
        'number.min': 'GPA must be at least 0',
        'number.max': 'GPA cannot exceed 4'
      }),
    
    cgpa: Joi.number()
      .min(0)
      .max(4)
      .optional()
      .messages({
        'number.min': 'CGPA must be at least 0',
        'number.max': 'CGPA cannot exceed 4'
      }),
    
    // Faculty-specific fields
    title: Joi.string()
      .max(100)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Title cannot exceed 100 characters'
      }),
    
    department_id: Joi.string()
      .uuid()
      .optional()
      .messages({
        'string.guid': 'Department ID must be a valid UUID'
      }),
    
    // Common fields (usually not updatable via this endpoint)
    profile_picture_url: Joi.forbidden()
  })
};

/**
 * Get users list query schema (for admin)
 */
const getUsersQuerySchema = {
  query: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .optional()
      .messages({
        'number.min': 'Page must be at least 1'
      }),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .optional()
      .messages({
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),
    
    role: Joi.string()
      .valid('student', 'faculty', 'admin', 'staff')
      .optional()
      .messages({
        'any.only': 'Role must be one of: student, faculty, admin, staff'
      }),
    
    is_verified: Joi.boolean()
      .optional(),
    
    search: Joi.string()
      .max(255)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Search query cannot exceed 255 characters'
      }),
    
    sort_by: Joi.string()
      .valid('created_at', 'email', 'role')
      .default('created_at')
      .optional(),
    
    order: Joi.string()
      .valid('ASC', 'DESC')
      .default('DESC')
      .optional()
  })
};

/**
 * User ID param schema
 */
const userIdParamSchema = {
  params: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.guid': 'User ID must be a valid UUID',
        'any.required': 'User ID is required'
      })
  })
};

module.exports = {
  updateProfileSchema,
  getUsersQuerySchema,
  userIdParamSchema
};
