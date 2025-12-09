/**
 * Validation Middleware using Joi
 * Validates request body, query, or params against Joi schema
 */

const { AppError } = require('./errorHandler');

/**
 * Validate request data against Joi schema
 * @param {Object} schema - Joi schema object with optional body, query, params keys
 */
const validate = (schema) => {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false, // Return all errors, not just the first one
      allowUnknown: true, // Allow unknown keys (for flexibility)
      stripUnknown: true // Remove unknown keys
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
};

module.exports = validate;
