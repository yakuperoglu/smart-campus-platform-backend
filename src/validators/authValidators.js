/**
 * Authentication Validation Schemas using Joi
 */

const Joi = require('joi');

/**
 * Registration validation schema
 */
const registerSchema = {
  body: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
      }),
    
    role: Joi.string()
      .valid('student', 'faculty', 'staff')
      .required()
      .messages({
        'any.only': 'Role must be either student, faculty, or staff',
        'any.required': 'Role is required'
      }),
    
    // Student-specific fields
    student_number: Joi.when('role', {
      is: 'student',
      then: Joi.string().required().messages({
        'any.required': 'Student number is required for students'
      }),
      otherwise: Joi.forbidden()
    }),
    
    department_id: Joi.when('role', {
      is: Joi.valid('student', 'faculty'),
      then: Joi.string().uuid().optional().allow('', null).messages({
        'string.guid': 'Department ID must be a valid UUID'
      }),
      otherwise: Joi.string().uuid().optional().allow('', null)
    }),
    
    // Faculty-specific fields
    employee_number: Joi.when('role', {
      is: 'faculty',
      then: Joi.string().required().messages({
        'any.required': 'Employee number is required for faculty'
      }),
      otherwise: Joi.forbidden()
    }),
    
    title: Joi.when('role', {
      is: 'faculty',
      then: Joi.string().optional().allow(''),
      otherwise: Joi.forbidden()
    })
  })
};

/**
 * Login validation schema
 */
const loginSchema = {
  body: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  })
};

/**
 * Email verification schema
 */
const verifyEmailSchema = {
  body: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Verification token is required'
      })
  })
};

/**
 * Refresh token schema
 */
const refreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token is required'
      })
  })
};

/**
 * Forgot password schema
 */
const forgotPasswordSchema = {
  body: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      })
  })
};

/**
 * Reset password schema
 */
const resetPasswordSchema = {
  body: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Reset token is required'
      }),
    
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
      }),
    
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Passwords must match',
        'any.required': 'Password confirmation is required'
      })
  })
};

module.exports = {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
