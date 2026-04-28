const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Import controllers and middleware
const PDFController = require('../controllers/pdfController');
const { optionalAuth } = require('../middleware/auth');

// Configure multer for PDF uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads/';
        // Create uploads directory if it doesn't exist
        const fs = require('fs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// Handle multer errors
const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            req.flash('error', 'File size exceeds 10MB limit');
        } else {
            req.flash('error', 'File upload error: ' + error.message);
        }
    } else if (error) {
        req.flash('error', error.message);
    }
    
    if (error) {
        return res.redirect('/');
    }
    next();
};

// ✅ PDF Upload Page
router.get('/', optionalAuth, PDFController.getUploadPage);

// ✅ Convert PDF to HTML
router.post('/convert', 
    optionalAuth,
    upload.single('pdf'),
    handleMulterError,
    PDFController.convertPDF
);

// ✅ Conversion History (future feature)
router.get('/history', optionalAuth, PDFController.getConversionHistory);

module.exports = router;
