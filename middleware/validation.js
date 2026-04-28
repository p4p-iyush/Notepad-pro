const { body, validationResult, param } = require('express-validator');

// 📝 Input Validation Middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessage = errors.array().map(err => err.msg).join(', ');
        req.flash('error', errorMessage);
        return res.redirect('back');
    }
    next();
};

// Validation rules for different operations
const validationRules = {
    // User registration validation
    register: [
        body('name')
            .trim()
            .isLength({ min: 3, max: 50 })
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage('Username must be 3-50 characters and contain only letters, numbers, and underscores'),
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        body('password')
            .isLength({ min: 8 })
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
        body('confirm_password')
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error('Password confirmation does not match password');
                }
                return true;
            }),
    ],

    // User login validation
    login: [
        body('username')
            .trim()
            .isLength({ min: 3, max: 50 })
            .withMessage('Username must be between 3 and 50 characters'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long'),
    ],

    // Document validation
    document: [
        body('title')
            .trim()
            .isLength({ min: 1, max: 200 })
            .withMessage('Title must be between 1 and 200 characters'),
        body('content')
            .trim()
            .isLength({ min: 1 })
            .withMessage('Content cannot be empty'),
        body('isPublic')
            .optional()
            .isBoolean()
            .withMessage('isPublic must be a boolean value'),
    ],

    // Document update validation (title is optional)
    documentUpdate: [
        body('title')
            .optional()
            .trim()
            .isLength({ min: 1, max: 200 })
            .withMessage('Title must be between 1 and 200 characters'),
        body('content')
            .trim()
            .isLength({ min: 1 })
            .withMessage('Content cannot be empty'),
        body('isPublic')
            .optional()
            .isBoolean()
            .withMessage('isPublic must be a boolean value'),
    ],

    // MongoDB ID validation
    mongoId: [
        param('id').isMongoId().withMessage('Invalid document ID')
    ]
};

module.exports = {
    handleValidationErrors,
    validationRules
};
