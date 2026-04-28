const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const UserRegistration = require('../models/registration');

// 🔄 Async Error Handler Wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// 🔐 Enhanced JWT Authentication Middleware
const requireAuth = asyncHandler(async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        req.flash('error', 'Please login to access this page');
        return res.redirect('/login');
    }

    try {
        const verified = jwt.verify(token, jwtConfig.secret);

        // Check if user still exists
        const user = await UserRegistration.findById(verified.id);
        if (!user) {
            res.clearCookie("token");
            req.flash('error', 'User account no longer exists');
            return res.redirect('/login');
        }
        
        // ✅ NEW - Include role from database
        req.user = {
            id: verified.id,
            name: verified.name,
            role: user.role || 'user'
        };

        next();
    } catch (error) {
        res.clearCookie("token");
        if (error.name === 'TokenExpiredError') {
            req.flash('error', 'Session expired. Please login again');
        } else {
            req.flash('error', 'Authentication failed. Please login again');
        }
        return res.redirect('/login');
    }
});

// 🏥 Authorization Middleware (Check if user owns the resource)
const requireOwnership = (Model) => asyncHandler(async (req, res, next) => {
    const document = await Model.findById(req.params.id);

    if (!document) {
        req.flash('error', 'Document not found');
        return res.redirect('/dashboard');
    }

    if (document.user.toString() !== req.user.id) {
        req.flash('error', 'You can only access your own documents');
        return res.redirect('/dashboard');
    }

    req.document = document;
    next();
});

// 🔐 Admin Authentication Middleware
const requireAdmin = asyncHandler(async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        req.flash('error', 'Admin access required');
        return res.redirect('/login');
    }
    next();
});

// 🔐 Optional Authentication (for public/private document viewing)
const optionalAuth = asyncHandler(async (req, res, next) => {
    const token = req.cookies.token;
    
    if (token) {
        try {
            const verified = jwt.verify(token, jwtConfig.secret);
            const user = await UserRegistration.findById(verified.id);
            
            if (user) {
                req.user = {
                    id: verified.id,
                    name: verified.name,
                    role: user.role || 'user'
                };
            }
        } catch (error) {
            // Token invalid, continue as anonymous user
            res.clearCookie("token");
        }
    }
    next();
});

module.exports = {
    requireAuth,
    requireOwnership,
    requireAdmin,
    optionalAuth,
    asyncHandler
};
