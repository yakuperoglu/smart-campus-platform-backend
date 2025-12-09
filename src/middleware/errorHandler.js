/**
 * Centralized Error Handler Middleware
 * Returns standardized error responses
 */

class AppError extends Error {
  constructor(message, statusCode, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.code = err.code || 'INTERNAL_SERVER_ERROR';

  // Log error for debugging (in production, use proper logger like Winston)
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Sequelize Validation Error
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map(e => e.message);
    error.message = messages.join(', ');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
  }

  // Sequelize Unique Constraint Error
  if (err.name === 'SequelizeUniqueConstraintError') {
    error.message = 'Duplicate field value entered';
    error.statusCode = 400;
    error.code = 'DUPLICATE_ERROR';
  }

  // Sequelize Foreign Key Constraint Error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    error.message = 'Invalid reference to related resource';
    error.statusCode = 400;
    error.code = 'FOREIGN_KEY_ERROR';
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.statusCode = 401;
    error.code = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.statusCode = 401;
    error.code = 'TOKEN_EXPIRED';
  }

  // Multer Errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error.message = 'File size exceeds maximum limit (5MB)';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      error.message = 'Unexpected field name in file upload';
    } else {
      error.message = 'File upload error';
    }
    error.statusCode = 400;
    error.code = 'FILE_UPLOAD_ERROR';
  }

  // Send error response
  res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

// Async handler wrapper to catch errors in async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler
};
