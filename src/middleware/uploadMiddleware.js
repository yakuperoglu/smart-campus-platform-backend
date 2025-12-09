/**
 * File Upload Middleware using Multer
 * Handles profile picture uploads
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('./errorHandler');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads/profiles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: userId-timestamp.extension
    const userId = req.user ? req.user.id : 'unknown';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${userId}-${uniqueSuffix}${ext}`);
  }
});

// File filter - only allow jpg, jpeg, png
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only JPG, JPEG, and PNG files are allowed', 400, 'INVALID_FILE_TYPE'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Middleware for single profile picture upload
const uploadProfilePicture = upload.single('profile_picture');

// Wrapper to handle multer errors
const handleUploadError = (req, res, next) => {
  uploadProfilePicture(req, res, (err) => {
    if (err) {
      // Handle multer-specific errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError('File size exceeds 5MB limit', 400, 'FILE_TOO_LARGE'));
        }
        return next(new AppError('File upload error: ' + err.message, 400, 'UPLOAD_ERROR'));
      }
      // Handle custom errors from fileFilter
      return next(err);
    }
    next();
  });
};

// Utility to delete old profile picture
const deleteOldProfilePicture = (pictureUrl) => {
  if (!pictureUrl) return;

  try {
    // Extract filename from URL (assuming URL format: /uploads/profiles/filename.jpg)
    const filename = path.basename(pictureUrl);
    const filePath = path.join(uploadDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting old profile picture:', error);
  }
};

module.exports = {
  uploadProfilePicture: handleUploadError,
  deleteOldProfilePicture
};
