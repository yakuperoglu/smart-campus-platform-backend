/**
 * Document Upload Middleware using Multer
 * Handles document uploads for excuses, assignments, etc.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('./errorHandler');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: type-userId-timestamp.extension
        const userId = req.user ? req.user.id : 'unknown';
        const type = 'doc';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${type}-${userId}-${uniqueSuffix}${ext}`);
    }
});

// File filter - allow PDF and Images
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Invalid file type. Only PDF, JPG, and PNG files are allowed', 400, 'INVALID_FILE_TYPE'), false);
    }
};

// Multer configuration
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size
    }
});

// Middleware for single document upload
const uploadDocument = upload.single('document');

// Wrapper to handle multer errors
const handleDocumentUpload = (req, res, next) => {
    uploadDocument(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new AppError('File size exceeds 10MB limit', 400, 'FILE_TOO_LARGE'));
                }
                return next(new AppError('File upload error: ' + err.message, 400, 'UPLOAD_ERROR'));
            }
            return next(err);
        }
        next();
    });
};

module.exports = {
    uploadDocument: handleDocumentUpload
};
