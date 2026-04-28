const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const createUploadsDir = () => {
    const uploadDir = './uploads/';
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('✅ Created uploads directory');
    }
};

// Initialize uploads directory
createUploadsDir();

// PDF upload configuration
const pdfUploadConfig = {
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, './uploads/');
        },
        filename: (req, file, cb) => {
            // Generate unique filename with timestamp and random number
            const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
            cb(null, uniqueName);
        }
    }),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1 // Only one file at a time
    },
    fileFilter: (req, file, cb) => {
        // Check if file is PDF
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            const error = new Error('Only PDF files are allowed');
            error.code = 'INVALID_FILE_TYPE';
            cb(error, false);
        }
    }
};

// Error handler for multer
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                req.flash('error', 'File size exceeds 10MB limit');
                break;
            case 'LIMIT_FILE_COUNT':
                req.flash('error', 'Too many files. Only one file allowed');
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                req.flash('error', 'Unexpected field name');
                break;
            default:
                req.flash('error', 'File upload error: ' + error.message);
        }
    } else if (error && error.code === 'INVALID_FILE_TYPE') {
        req.flash('error', error.message);
    } else if (error) {
        req.flash('error', 'Upload error: ' + error.message);
    }
    
    if (error) {
        return res.redirect('/');
    }
    next();
};

module.exports = {
    pdfUploadConfig,
    handleUploadError,
    createUploadsDir
};
