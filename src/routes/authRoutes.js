/**
 * Authentication Routes
 * Handles user registration, login, verification, and password management
 */

const express = require('express');
const router = express.Router();

const {
  register,
  verifyEmail,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const { verifyToken } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../validators/authValidators');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user (student or faculty)
 * @access  Public
 */
router.post('/register', validate(registerSchema), register);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify user email with token
 * @access  Public
 */
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user and return tokens
 * @access  Public
 */
router.post('/login', validate(loginSchema), login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', validate(refreshTokenSchema), refreshAccessToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and invalidate refresh token
 * @access  Private
 */
router.post('/logout', verifyToken, logout);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

module.exports = router;
