/**
 * Authentication Middleware
 * Verifies JWT access token and attaches user to request
 */

const jwt = require('jsonwebtoken');
const { User, Student, Faculty, Admin } = require('../models');
const { AppError } = require('./errorHandler');

const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return next(new AppError('Not authorized to access this route', 401, 'NO_TOKEN'));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password_hash', 'refresh_token'] },
        include: [
          { model: Student, as: 'studentProfile' },
          { model: Faculty, as: 'facultyProfile' },
          { model: Admin, as: 'adminProfile' }
        ]
      });

      if (!user) {
        return next(new AppError('User not found', 401, 'USER_NOT_FOUND'));
      }

      // Email doğrulaması olmadan da sisteme erişilebilir
      // Kullanıcı profil sayfasından email'ini doğrulayabilir

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'));
      }
      return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    }
  } catch (error) {
    next(error);
  }
};

// Optional auth - doesn't fail if no token, but attaches user if valid token provided
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password_hash', 'refresh_token'] }
      });

      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Silently fail for optional auth
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to load role-specific profile
const loadUserProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED'));
    }

    const userId = req.user.id;
    const role = req.user.role;

    let profile = null;

    switch (role) {
      case 'student':
        profile = await Student.findOne({
          where: { user_id: userId },
          include: [{ model: require('../models/Department'), as: 'department' }]
        });
        break;
      case 'faculty':
        profile = await Faculty.findOne({
          where: { user_id: userId },
          include: [{ model: require('../models/Department'), as: 'department' }]
        });
        break;
      case 'admin':
        profile = await Admin.findOne({
          where: { user_id: userId }
        });
        break;
      default:
        break;
    }

    req.userProfile = profile;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    next(new AppError('Not authorized as an admin', 403, 'FORBIDDEN'));
  }
};

module.exports = {
  verifyToken,
  optionalAuth,
  loadUserProfile,
  isAdmin
};
