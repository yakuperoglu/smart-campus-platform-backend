/**
 * Authentication Controller
 * Handles user registration, login, email verification, and password management
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sequelize, User, Student, Faculty, Admin, Department, EmailVerification, PasswordReset, Wallet } = require('../models');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwtHelper');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/emailService');
const { AppError } = require('../middleware/errorHandler');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user (student or faculty)
 * @access  Public
 */
const register = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { email, password, role, student_number, employee_number, title, department_id } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      await transaction.rollback();
      return next(new AppError('User with this email already exists', 400, 'USER_EXISTS'));
    }

    // Validate department if provided
    if (department_id) {
      const department = await Department.findByPk(department_id);
      if (!department) {
        await transaction.rollback();
        return next(new AppError('Invalid department', 400, 'INVALID_DEPARTMENT'));
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      email,
      password_hash,
      role,
      is_verified: false
    }, { transaction });

    // Create role-specific record
    if (role === 'student') {
      // Check if student number already exists
      const existingStudent = await Student.findOne({ where: { student_number } });
      if (existingStudent) {
        await transaction.rollback();
        return next(new AppError('Student number already exists', 400, 'STUDENT_NUMBER_EXISTS'));
      }

      await Student.create({
        user_id: user.id,
        student_number,
        department_id: department_id || null,
        gpa: 0.00,
        cgpa: 0.00
      }, { transaction });

    } else if (role === 'faculty') {
      // Check if employee number already exists
      const existingFaculty = await Faculty.findOne({ where: { employee_number } });
      if (existingFaculty) {
        await transaction.rollback();
        return next(new AppError('Employee number already exists', 400, 'EMPLOYEE_NUMBER_EXISTS'));
      }

      await Faculty.create({
        user_id: user.id,
        employee_number,
        title: title || null,
        department_id: department_id || null
      }, { transaction });
    }

    // Create wallet for user
    await Wallet.create({
      user_id: user.id,
      balance: 0.00,
      currency: 'TRY'
    }, { transaction });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await EmailVerification.create({
      user_id: user.id,
      token: verificationToken,
      expires_at: expiresAt,
      is_used: false
    }, { transaction });

    // Commit transaction
    await transaction.commit();

    // Send verification email (async, don't wait)
    sendVerificationEmail(email, verificationToken).catch(err => {
      console.error('Failed to send verification email:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          is_verified: user.is_verified
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify user email with token
 * @access  Public
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    // Find verification record
    const verification = await EmailVerification.findOne({
      where: { token, is_used: false }
    });

    if (!verification) {
      return next(new AppError('Invalid or expired verification token', 400, 'INVALID_TOKEN'));
    }

    // Check if token expired
    if (new Date() > new Date(verification.expires_at)) {
      return next(new AppError('Verification token has expired', 400, 'TOKEN_EXPIRED'));
    }

    // Get user
    const user = await User.findByPk(verification.user_id);
    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    // Update user and verification record
    await user.update({ is_verified: true });
    await verification.update({ is_used: true });

    // Send welcome email (async)
    sendWelcomeEmail(user.email, user.email.split('@')[0]).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now login.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          is_verified: user.is_verified
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user and return tokens
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    // Check if email is verified
    if (!user.is_verified) {
      return next(new AppError('Please verify your email before logging in', 403, 'EMAIL_NOT_VERIFIED'));
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokenPair(user.id);

    // Save refresh token to database
    await user.update({ refresh_token: refreshToken });

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
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          profile_picture_url: user.profile_picture_url,
          is_verified: user.is_verified,
          profile
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return next(new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN'));
    }

    // Find user and check if refresh token matches
    const user = await User.findByPk(decoded.id);
    if (!user || user.refresh_token !== refreshToken) {
      return next(new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN'));
    }

    // Generate new token pair
    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user.id);

    // Update refresh token in database
    await user.update({ refresh_token: newRefreshToken });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and invalidate refresh token
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    const user = req.user;

    // Remove refresh token from database
    await User.update(
      { refresh_token: null },
      { where: { id: user.id } }
    );

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if user exists or not (security)
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete old reset tokens for this user
    await PasswordReset.destroy({ where: { user_id: user.id } });

    // Create new reset token
    await PasswordReset.create({
      user_id: user.id,
      token: resetToken,
      expires_at: expiresAt,
      is_used: false
    });

    // Send reset email (async)
    sendPasswordResetEmail(email, resetToken).catch(err => {
      console.error('Failed to send password reset email:', err);
    });

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    // Find reset record
    const resetRecord = await PasswordReset.findOne({
      where: { token, is_used: false }
    });

    if (!resetRecord) {
      return next(new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN'));
    }

    // Check if token expired
    if (new Date() > new Date(resetRecord.expires_at)) {
      return next(new AppError('Reset token has expired', 400, 'TOKEN_EXPIRED'));
    }

    // Get user
    const user = await User.findByPk(resetRecord.user_id);
    if (!user) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    // Hash new password
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
    const password_hash = await bcrypt.hash(password, salt);

    // Update password and invalidate all refresh tokens
    await user.update({
      password_hash,
      refresh_token: null
    });

    // Mark reset token as used
    await resetRecord.update({ is_used: true });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.'
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword
};
