/**
 * User Controller
 * Handles user profile management and admin operations
 */

const { Op } = require('sequelize');
const { User, Student, Faculty, Admin, Department, Wallet } = require('../models');
const { AppError } = require('../middleware/errorHandler');
const { deleteOldProfilePicture } = require('../middleware/uploadMiddleware');

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile with role-specific data
 * @access  Private
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Get user with role-specific profile
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash', 'refresh_token'] }
    });

    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    let profile = null;
    let wallet = null;

    // Get role-specific profile
    if (role === 'student') {
      profile = await Student.findOne({
        where: { user_id: userId },
        include: [{ model: Department, as: 'department' }]
      });
    } else if (role === 'faculty') {
      profile = await Faculty.findOne({
        where: { user_id: userId },
        include: [{ model: Department, as: 'department' }]
      });
    } else if (role === 'admin') {
      profile = await Admin.findOne({
        where: { user_id: userId }
      });
    }

    // Get wallet
    wallet = await Wallet.findOne({
      where: { user_id: userId },
      attributes: ['id', 'balance', 'currency', 'is_active']
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          ...user.toJSON(),
          profile,
          wallet
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/users/me
 * @desc    Update current user profile
 * @access  Private
 */
const updateCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const updates = req.body;

    // Update role-specific profile
    let updatedProfile = null;

    if (role === 'student') {
      const student = await Student.findOne({ where: { user_id: userId } });
      if (!student) {
        return next(new AppError('Student profile not found', 404, 'PROFILE_NOT_FOUND'));
      }

      // Allow updating certain fields
      const allowedUpdates = {};
      if (updates.department_id !== undefined) {
        // Verify department exists
        const department = await Department.findByPk(updates.department_id);
        if (!department) {
          return next(new AppError('Invalid department', 400, 'INVALID_DEPARTMENT'));
        }
        allowedUpdates.department_id = updates.department_id;
      }
      // Note: GPA/CGPA typically updated by system/admin, not by student
      // But allowing it here for flexibility
      if (updates.gpa !== undefined) allowedUpdates.gpa = updates.gpa;
      if (updates.cgpa !== undefined) allowedUpdates.cgpa = updates.cgpa;

      await student.update(allowedUpdates);
      updatedProfile = await Student.findOne({
        where: { user_id: userId },
        include: [{ model: Department, as: 'department' }]
      });

    } else if (role === 'faculty') {
      const faculty = await Faculty.findOne({ where: { user_id: userId } });
      if (!faculty) {
        return next(new AppError('Faculty profile not found', 404, 'PROFILE_NOT_FOUND'));
      }

      const allowedUpdates = {};
      if (updates.title !== undefined) allowedUpdates.title = updates.title;
      if (updates.department_id !== undefined) {
        const department = await Department.findByPk(updates.department_id);
        if (!department) {
          return next(new AppError('Invalid department', 400, 'INVALID_DEPARTMENT'));
        }
        allowedUpdates.department_id = updates.department_id;
      }

      await faculty.update(allowedUpdates);
      updatedProfile = await Faculty.findOne({
        where: { user_id: userId },
        include: [{ model: Department, as: 'department' }]
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        profile: updatedProfile
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/users/me/profile-picture
 * @desc    Upload profile picture
 * @access  Private
 */
const uploadProfilePicture = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check if file was uploaded
    if (!req.file) {
      return next(new AppError('No file uploaded', 400, 'NO_FILE'));
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    // Delete old profile picture if exists
    if (user.profile_picture_url) {
      deleteOldProfilePicture(user.profile_picture_url);
    }

    // Generate URL for the uploaded file
    const fileUrl = `/uploads/profiles/${req.file.filename}`;

    // Update user profile picture URL
    await user.update({ profile_picture_url: fileUrl });

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profile_picture_url: fileUrl
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/users/me/profile-picture
 * @desc    Delete profile picture
 * @access  Private
 */
const deleteProfilePicture = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    // Delete file if exists
    if (user.profile_picture_url) {
      deleteOldProfilePicture(user.profile_picture_url);
      await user.update({ profile_picture_url: null });
    }

    res.status(200).json({
      success: true,
      message: 'Profile picture deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with pagination and filtering (Admin only)
 * @access  Private/Admin
 */
const getAllUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      is_verified,
      search,
      sort_by = 'created_at',
      order = 'DESC'
    } = req.query;

    // Build where clause
    const where = {};
    
    if (role) {
      where.role = role;
    }
    
    if (is_verified !== undefined) {
      where.is_verified = is_verified === 'true' || is_verified === true;
    }
    
    if (search) {
      where.email = {
        [Op.iLike]: `%${search}%`
      };
    }

    // Calculate offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get users with pagination
    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash', 'refresh_token'] },
      limit: parseInt(limit),
      offset: offset,
      order: [[sort_by, order]]
    });

    // Load role-specific profiles for each user
    const usersWithProfiles = await Promise.all(
      users.map(async (user) => {
        let profile = null;
        
        if (user.role === 'student') {
          profile = await Student.findOne({
            where: { user_id: user.id },
            include: [{ model: Department, as: 'department' }]
          });
        } else if (user.role === 'faculty') {
          profile = await Faculty.findOne({
            where: { user_id: user.id },
            include: [{ model: Department, as: 'department' }]
          });
        } else if (user.role === 'admin') {
          profile = await Admin.findOne({
            where: { user_id: user.id }
          });
        }

        return {
          ...user.toJSON(),
          profile
        };
      })
    );

    // Calculate pagination info
    const totalPages = Math.ceil(count / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        users: usersWithProfiles,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID (Admin only)
 * @access  Private/Admin
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash', 'refresh_token'] }
    });

    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    // Get role-specific profile
    let profile = null;
    
    if (user.role === 'student') {
      profile = await Student.findOne({
        where: { user_id: user.id },
        include: [{ model: Department, as: 'department' }]
      });
    } else if (user.role === 'faculty') {
      profile = await Faculty.findOne({
        where: { user_id: user.id },
        include: [{ model: Department, as: 'department' }]
      });
    } else if (user.role === 'admin') {
      profile = await Admin.findOne({
        where: { user_id: user.id }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          ...user.toJSON(),
          profile
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentUser,
  updateCurrentUser,
  uploadProfilePicture,
  deleteProfilePicture,
  getAllUsers,
  getUserById
};
