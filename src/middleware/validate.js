/**
 * Validation Middleware
 * Supports both Joi schemas and express-validator chains
 */

const { validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * Express-validator middleware logic
 */
const validateExpressValidator = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    return next(new AppError(errorMessages, 400, 'VALIDATION_ERROR'));
  }
  next();
};

/**
 * Universal validate function that handles both:
 * 1. Joi schema validation (when called with schema argument)
 * 2. Express-validator chain results (when used as middleware after validators)
 * 
 * @param {Object} schema - Optional Joi schema object with body, query, params keys
 */
const validate = (schema, res, next) => {
  // If called as a middleware directly (req, res, next), schema is actually req
  if (next && typeof next === 'function') {
    return validateExpressValidator(schema, res, next);
  }

  // Otherwise, return a middleware function (factory pattern)
  return (req, res, next) => {
    // If schema is provided, check if it's Joi validation
    // We strictly check for .validate function to distinguish from Express req object
    const isJoiSchema = schema && (
      (schema.body && typeof schema.body.validate === 'function') ||
      (schema.query && typeof schema.query.validate === 'function') ||
      (schema.params && typeof schema.params.validate === 'function')
    );

    if (isJoiSchema) {
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

      return next();
    }

    // Default fallback to express-validator if not Joi schema
    // (This handles cases where validate() is called with an empty object or similar)
    return validateExpressValidator(req, res, next);
  };
};

module.exports = validate;
module.exports.validate = validateExpressValidator;
