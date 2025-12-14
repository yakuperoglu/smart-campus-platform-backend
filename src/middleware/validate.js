/**
 * Validation Middleware
 * Supports both Joi schemas and express-validator chains
 */

const { validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * Universal validate function that handles both:
 * 1. Joi schema validation (when called with schema argument)
 * 2. Express-validator chain results (when used as middleware after validators)
 * 
 * @param {Object} schema - Optional Joi schema object with body, query, params keys
 */
const validate = (schema) => {
  // If schema is provided, it's Joi validation
  if (schema && (schema.body || schema.query || schema.params)) {
    return (req, res, next) => {
      const validationOptions = {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true
      };

      // Validate body
      if (schema.body) {
        const { error, value } = schema.body.validate(req.body, validationOptions);
        if (error) {
          const errorMessage = error.details.map(detail => detail.message).join(', ');
          return next(new AppError(errorMessage, 400, 'VALIDATION_ERROR'));
        }
        req.body = value;
      }

      // Validate query parameters
      if (schema.query) {
        const { error, value } = schema.query.validate(req.query, validationOptions);
        if (error) {
          const errorMessage = error.details.map(detail => detail.message).join(', ');
          return next(new AppError(errorMessage, 400, 'VALIDATION_ERROR'));
        }
        req.query = value;
      }

      // Validate route parameters
      if (schema.params) {
        const { error, value } = schema.params.validate(req.params, validationOptions);
        if (error) {
          const errorMessage = error.details.map(detail => detail.message).join(', ');
          return next(new AppError(errorMessage, 400, 'VALIDATION_ERROR'));
        }
        req.params = value;
      }

      next();
    };
  }

  // If no schema or schema is a request object, it's express-validator
  // This means validate is used as middleware after express-validator chains
  return (req, res, next) => {
    // If called without schema (as middleware), req is actually the first arg
    const actualReq = schema && schema.body !== undefined && typeof schema.body !== 'object' ? schema : req;
    const actualRes = schema && schema.body !== undefined && typeof schema.body !== 'object' ? req : res;
    const actualNext = schema && schema.body !== undefined && typeof schema.body !== 'object' ? res : next;

    const errors = validationResult(actualReq);
    
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg).join(', ');
      return actualNext(new AppError(errorMessages, 400, 'VALIDATION_ERROR'));
    }
    
    actualNext();
  };
};

/**
 * Express-validator middleware
 * Use directly as middleware after express-validator check chains
 */
const validateExpressValidator = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    return next(new AppError(errorMessages, 400, 'VALIDATION_ERROR'));
  }
  
  next();
};

// Export both default (for Joi backwards compatibility) and named export
module.exports = validate;
module.exports.validate = validateExpressValidator;
