/**
 * User Controller
 * Handles user profile management and admin operations
 */

const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
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

    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    // Update User table fields (personal information)
    const userUpdates = {};
    if (updates.first_name !== undefined) userUpdates.first_name = updates.first_name;
    if (updates.last_name !== undefined) userUpdates.last_name = updates.last_name;
    if (updates.phone !== undefined) userUpdates.phone = updates.phone;
    if (updates.address !== undefined) userUpdates.address = updates.address;

    // Update user if there are any user-level updates
    if (Object.keys(userUpdates).length > 0) {
      await user.update(userUpdates);
    }

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

      if (Object.keys(allowedUpdates).length > 0) {
        await student.update(allowedUpdates);
      }

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

      if (Object.keys(allowedUpdates).length > 0) {
        await faculty.update(allowedUpdates);
      }

      updatedProfile = await Faculty.findOne({
        where: { user_id: userId },
        include: [{ model: Department, as: 'department' }]
      });
    }

    // Get updated user data
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash', 'refresh_token'] }
    });

    // Get wallet
    const wallet = await Wallet.findOne({
      where: { user_id: userId },
      attributes: ['id', 'balance', 'currency', 'is_active']
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          ...updatedUser.toJSON(),
          profile: updatedProfile,
          wallet
        }
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

/**
 * @route   POST /api/v1/users/me/change-password
 * @desc    Change current user password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Get user with password hash
    const user = await User.findByPk(userId);
    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    // Check current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      return next(new AppError('Invalid current password', 400, 'INVALID_PASSWORD'));
    }

    // Hash new password
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    // Update password
    await user.update({ password_hash });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update any user (Admin only)
 * @access  Private/Admin
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    // Role-specific field updates
    if (user.role === 'student' && (updates.student_number || updates.gpa)) {
      const student = await Student.findOne({ where: { user_id: id } });
      if (student) await student.update(updates);
    } else if (user.role === 'faculty' && (updates.employee_number || updates.title)) {
      const faculty = await Faculty.findOne({ where: { user_id: id } });
      if (faculty) await faculty.update(updates);
    }

    // General user updates
    await user.update(updates);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (Admin only)
 * @access  Private/Admin
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    await user.destroy(); // Cascading delete handled by DB relations

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
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
  getUserById,
  changePassword,
  updateUser,
  deleteUser
};
