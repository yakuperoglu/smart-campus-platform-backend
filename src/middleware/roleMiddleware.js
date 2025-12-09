/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if user has required role to access route
 */

const { AppError } = require('./errorHandler');

/**
 * Check if user has one of the allowed roles
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'faculty', 'student')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401, 'NOT_AUTHENTICATED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `User role '${req.user.role}' is not authorized to access this route`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

/**
 * Check if user owns the resource (e.g., updating own profile)
 * Admins are always allowed
 */
const authorizeOwnership = (userIdParam = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401, 'NOT_AUTHENTICATED'));
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
    
    if (!resourceUserId || resourceUserId !== req.user.id) {
      return next(
        new AppError(
          'You are not authorized to perform this action on this resource',
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

/**
 * Admin-only middleware
 */
const adminOnly = authorize('admin');

/**
 * Faculty or Admin
 */
const facultyOrAdmin = authorize('faculty', 'admin');

/**
 * Student only
 */
const studentOnly = authorize('student');

/**
 * Any authenticated user (student, faculty, admin, staff)
 */
const authenticated = authorize('student', 'faculty', 'admin', 'staff');

module.exports = {
  authorize,
  authorizeOwnership,
  adminOnly,
  facultyOrAdmin,
  studentOnly,
  authenticated
};
