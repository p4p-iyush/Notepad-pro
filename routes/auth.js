const express = require('express');
const router = express.Router();

// Import controllers and middleware
const AuthController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { validationRules, handleValidationErrors } = require('../middleware/validation');

// ✅ Login Page
router.get('/login', AuthController.getLoginPage);

// ✅ Registration Page
router.get('/register', AuthController.getRegisterPage);

// ✅ Login Route with Validation & Flash Messages
router.post('/login', 
    validationRules.login,
    handleValidationErrors,
    AuthController.login
);

// ✅ Registration Route with Flash Messages
router.post('/register',
    validationRules.register,
    handleValidationErrors,
    AuthController.register
);

// ✅ Debug User Route (Protected)
router.get('/debug-user', requireAuth, AuthController.debugUser);

// ✅ Logout Route
router.get('/logout', AuthController.logout);

module.exports = router;
