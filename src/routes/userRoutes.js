/**
 * User Routes
 * Handles user profile management and admin operations
 */

const express = require('express');
const router = express.Router();

const {
  getCurrentUser,
  updateCurrentUser,
  uploadProfilePicture,
  deleteProfilePicture,
  getAllUsers,
  getUserById
} = require('../controllers/userController');

const { verifyToken } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');
const { uploadProfilePicture: uploadMiddleware } = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validate');
const {
  updateProfileSchema,
  getUsersQuerySchema,
  userIdParamSchema
} = require('../validators/userValidators');

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile with role-specific data
 * @access  Private
 */
router.get('/me', verifyToken, getCurrentUser);

/**
 * @route   PUT /api/v1/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', verifyToken, validate(updateProfileSchema), updateCurrentUser);

/**
 * @route   POST /api/v1/users/me/profile-picture
 * @desc    Upload profile picture
 * @access  Private
 */
router.post('/me/profile-picture', verifyToken, uploadMiddleware, uploadProfilePicture);

/**
 * @route   DELETE /api/v1/users/me/profile-picture
 * @desc    Delete profile picture
 * @access  Private
 */
router.delete('/me/profile-picture', verifyToken, deleteProfilePicture);

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with pagination and filtering (Admin only)
 * @access  Private/Admin
 */
router.get('/', verifyToken, adminOnly, validate(getUsersQuerySchema), getAllUsers);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID (Admin only)
 * @access  Private/Admin
 */
router.get('/:id', verifyToken, adminOnly, validate(userIdParamSchema), getUserById);

module.exports = router;
