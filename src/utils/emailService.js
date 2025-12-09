/**
 * Email Service using Nodemailer
 * Sends verification, password reset, and notification emails
 */

const nodemailer = require('nodemailer');

/**
 * Create email transporter
 * In development, use ethereal.email (mock SMTP) or configure real SMTP
 */
const createTransporter = async () => {
  // For production, use real SMTP credentials from .env
  if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  // For development, create test account using Ethereal
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

/**
 * Send email verification
 */
const sendVerificationEmail = async (email, token) => {
  try {
    const transporter = await createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: `"Smart Campus Platform" <${process.env.SMTP_USER || 'noreply@smartcampus.edu'}>`,
      to: email,
      subject: 'Verify Your Email - Smart Campus Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Email Verification</h2>
          <p>Thank you for registering with Smart Campus Platform!</p>
          <p>Please click the button below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #3498db; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p style="color: #7f8c8d; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #3498db; word-break: break-all; font-size: 12px;">
            ${verificationUrl}
          </p>
          <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
            This link will expire in 24 hours. If you didn't create an account, please ignore this email.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    // Log preview URL in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Verification email sent!');
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, token) => {
  try {
    const transporter = await createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: `"Smart Campus Platform" <${process.env.SMTP_USER || 'noreply@smartcampus.edu'}>`,
      to: email,
      subject: 'Password Reset Request - Smart Campus Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Password Reset Request</h2>
          <p>We received a request to reset your password for your Smart Campus Platform account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #e74c3c; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #7f8c8d; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #e74c3c; word-break: break-all; font-size: 12px;">
            ${resetUrl}
          </p>
          <p style="color: #e74c3c; font-weight: bold; margin-top: 20px;">
            This link will expire in 1 hour.
          </p>
          <p style="color: #7f8c8d; font-size: 12px;">
            If you didn't request a password reset, please ignore this email or contact support if you have concerns.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    // Log preview URL in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Password reset email sent!');
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Send welcome email after verification
 */
const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = await createTransporter();
    
    const mailOptions = {
      from: `"Smart Campus Platform" <${process.env.SMTP_USER || 'noreply@smartcampus.edu'}>`,
      to: email,
      subject: 'Welcome to Smart Campus Platform!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #27ae60;">Welcome to Smart Campus Platform! 🎉</h2>
          <p>Hi ${name},</p>
          <p>Your email has been successfully verified! You can now access all features of the Smart Campus Platform.</p>
          <p>Here's what you can do:</p>
          <ul>
            <li>📚 View and enroll in courses</li>
            <li>✅ Check attendance records</li>
            <li>🍽️ Reserve meals at cafeterias</li>
            <li>🎫 Register for campus events</li>
            <li>💳 Manage your digital wallet</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/login" 
               style="background-color: #27ae60; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
            If you have any questions, feel free to contact our support team.
          </p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Welcome email sent!');
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome email - it's not critical
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail
};
