require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult, param } = require('express-validator');
const compression = require('compression');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_change_in_production";
const MONGO_URI = process.env.MONGO_URI;

// Validate required environment variables
if (!MONGO_URI) {
    console.error('❌ MONGO_URI environment variable is required');
    process.exit(1);
}

// Import Mongoose Models
const User = require('./models/user');
const UserRegistration = require('./models/registration');

// 🛡️ Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        },
    },
}));

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// 🚦 Rate Limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs for auth routes
    message: { error: "Too many authentication attempts, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(generalLimiter);
app.use('/login', authLimiter);
app.use('/register', authLimiter);

// 📝 Middleware
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🔗 Session Configuration (MUST be before flash!)
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// 📢 Flash Messages
app.use(flash());

// Make flash messages available to all views
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.warning = req.flash('warning');
    next();
});

app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d', // Cache static files for 1 day
    etag: true
}));

// Set view engine
app.set("view engine", "ejs");

// 📊 Request Logging Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});

// 🔄 Async Error Handler Wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

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

// 🔐 Enhanced JWT Authentication Middleware
const requireAuth = asyncHandler(async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        req.flash('error', 'Please login to access this page');
        return res.redirect('/login');
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);

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
const requireOwnership = asyncHandler(async (req, res, next) => {
    const document = await User.findById(req.params.id);

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

// 📊 MongoDB Connection with Retry Logic
const connectDB = async () => {
    let retries = 5;
    while (retries) {
        try {
            await mongoose.connect(MONGO_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: 10, // Maximum number of socket connections
                serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
                socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
                bufferMaxEntries: 0, // Disable mongoose buffering
                bufferCommands: false, // Disable mongoose buffering
            });
            console.log('✅ MongoDB connected successfully');
            break;
        } catch (error) {
            console.error(`❌ MongoDB connection error: ${error.message}`);
            retries--;
            console.log(`Retries left: ${retries}`);
            if (retries === 0) {
                console.error('❌ Failed to connect to MongoDB after 5 attempts');
                process.exit(1);
            }
            // Wait 5 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};

connectDB();

// 🌟 Health Check Route
app.get('/health', asyncHandler(async (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
    });
}));

// 🌟 Routes

// ✅ Homepage - Show Public Posts
app.get('/', asyncHandler(async (req, res) => {
    try {
        const allText = await User.find({ isPublic: true })
            .sort({ Currentdate: -1 })
            .populate('user', 'name')
            .limit(50); // Limit results for performance

        res.render('index', { allText, username: null });
    } catch (error) {
        console.error("Error fetching public notes:", error);
        req.flash('error', 'Unable to load public notes. Please try again later.');
        res.render('index', { allText: [], username: null });
    }
}));

// ✅ Login Page
app.get('/login', (req, res) => {
    res.render('login');
});

// ✅ Registration Page
app.get('/register', (req, res) => {
    res.render('login'); // Using combined login/register page
});

// ✅ Login Route with Validation & Flash Messages
app.post('/login', [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
], handleValidationErrors, asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Find user by username
    const user = await UserRegistration.findOne({ name: username });
    if (!user) {
        req.flash('error', 'Invalid username or password');
        return res.redirect('/login');
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        req.flash('error', 'Invalid username or password');
        return res.redirect('/login');
    }

    // Generate JWT Token
    const token = jwt.sign(
        { id: user._id, name: user.name },
        JWT_SECRET,
        { expiresIn: "24h" }
    );

    // Store JWT in HTTP-only cookie
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Flash message and redirect
    req.flash('success', `Welcome back, ${user.name}! Login successful.`);
    res.redirect('/dashboard');
}));

// ✅ Registration Route with Flash Messages
app.post('/register', [
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
], handleValidationErrors, asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUserByEmail = await UserRegistration.findOne({ email });
    if (existingUserByEmail) {
        req.flash('error', 'Email already registered. Please use a different email address.');
        return res.redirect('/register');
    }

    const existingUserByName = await UserRegistration.findOne({ name });
    if (existingUserByName) {
        req.flash('error', 'Username already taken. Please choose a different username.');
        return res.redirect('/register');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = await UserRegistration.create({
        name,
        email,
        password: hashedPassword
    });

    console.log(`✅ New user registered: ${newUser.name} (${newUser.email})`);

    req.flash('success', 'Registration successful! Please login with your credentials.');
    res.redirect('/login');
}));
app.get('/debug-user', requireAuth, (req, res) => {
    res.json({
        user: req.user,
        isAdmin: req.user?.role === 'admin',
        canAccessAdmin: req.user && req.user.role === 'admin'
    });
});

// ✅ Dashboard - Protected Route
app.get('/dashboard', requireAuth, asyncHandler(async (req, res) => {
    const userDocuments = await User.find({ user: req.user.id })
        .sort({ Currentdate: -1 })
        .limit(100);

    res.render('index', {
        username: req.user.name,
        allText: userDocuments
    });
}));

// ✅ Text Editor Page
app.get('/editors', requireAuth, (req, res) => {
    res.render('text_editor');
});

// ✅ Save New Document
app.post('/save', requireAuth, [
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
], handleValidationErrors, asyncHandler(async (req, res) => {
    const { title, content, isPublic } = req.body;

    const newDocument = await User.create({
        title: title.trim(),
        content: content.trim(),
        isPublic: Boolean(isPublic),
        user: req.user.id,
        Currentdate: new Date()
    });

    console.log(`📝 New document created: "${title}" by ${req.user.name}`);

    req.flash('success', `Document "${title}" saved successfully!`);
    res.status(201).json({
        message: "Document saved successfully",
        documentId: newDocument._id
    });
}));

// ✅ Edit Document Page
app.get('/edit/:id', [
    param('id').isMongoId().withMessage('Invalid document ID')
], handleValidationErrors, requireAuth, requireOwnership, asyncHandler(async (req, res) => {
    res.render('edit', { text: req.document });
}));

// ✅ Update Document
app.post('/update/:id', [
    param('id').isMongoId().withMessage('Invalid document ID'),
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
], handleValidationErrors, requireAuth, requireOwnership, asyncHandler(async (req, res) => {
    const { title, content, isPublic } = req.body;

    const updateData = {
        content: content.trim(),
        Currentdate: new Date()
    };

    // Only update title if provided
    if (title !== undefined) {
        updateData.title = title.trim();
    }

    // Only update isPublic if provided
    if (isPublic !== undefined) {
        updateData.isPublic = Boolean(isPublic);
    }

    const updatedDocument = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    );

    console.log(`📝 Document updated: "${updatedDocument.title}" by ${req.user.name}`);

    res.json({
        message: "Document updated successfully",
        document: updatedDocument
    });
}));

// ✅ Delete Document
app.get('/delete/:id', [
    param('id').isMongoId().withMessage('Invalid document ID')
], handleValidationErrors, requireAuth, requireOwnership, asyncHandler(async (req, res) => {
    const documentTitle = req.document.title;
    await User.findByIdAndDelete(req.params.id);

    console.log(`🗑️ Document deleted: ${req.params.id} by ${req.user.name}`);

    req.flash('success', `Document "${documentTitle}" deleted successfully.`);
    res.redirect('/dashboard');
}));

// ✅ View Document - Public or Private
app.get('/view/:id', [
    param('id').isMongoId().withMessage('Invalid document ID')
], handleValidationErrors, asyncHandler(async (req, res) => {
    const document = await User.findById(req.params.id).populate('user', 'name');

    if (!document) {
        req.flash('error', 'Document not found or has been deleted');
        return res.redirect('/');
    }

    // Check if document is public or user owns it
    const token = req.cookies.token;
    let isOwner = false;

    if (token) {
        try {
            const verified = jwt.verify(token, JWT_SECRET);
            isOwner = document.user._id.toString() === verified.id;
        } catch (error) {
            // Token invalid, but continue as anonymous user
        }
    }

    if (!document.isPublic && !isOwner) {
        req.flash('error', 'This document is private and you do not have permission to view it');
        return res.redirect('/');
    }

    res.render('view', { text: document });
}));

// ✅ Logout Route
app.get('/logout', (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });

    req.flash('success', 'You have been logged out successfully');
    res.redirect('/');
});


// 🔐 Admin Authentication Middleware
const requireAdmin = asyncHandler(async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        req.flash('error', 'Admin access required');
        return res.redirect('/login');
    }
    next();
});

// 📊 Admin Dashboard
app.get('/admin', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const totalUsers = await UserRegistration.countDocuments();
    const totalDocuments = await User.countDocuments();
    const publicDocuments = await User.countDocuments({ isPublic: true });
    const privateDocuments = await User.countDocuments({ isPublic: false });

    const recentUsers = await UserRegistration.find()
        .sort({ createdAt: -1 })
        .limit(5);

    const recentDocuments = await User.find()
        .populate('user', 'name email')
        .sort({ Currentdate: -1 })
        .limit(5);

    res.render('admin/dashboard', {
        username: req.user.name,
        stats: {
            totalUsers,
            totalDocuments,
            publicDocuments,
            privateDocuments
        },
        recentUsers,
        recentDocuments
    });
}));

// 👥 Admin - Users Management
app.get('/admin/users', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || '';
    const filter = searchQuery
        ? {
            $or: [
                { name: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } }
            ]
        }
        : {};

    const users = await UserRegistration.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await UserRegistration.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Get document count for each user
    const usersWithDocCount = await Promise.all(
        users.map(async (user) => {
            const docCount = await User.countDocuments({ user: user._id });
            return {
                ...user.toObject(),
                documentCount: docCount
            };
        })
    );

    res.render('admin/users', {
        username: req.user.name,
        users: usersWithDocCount,
        currentPage: page,
        totalPages,
        searchQuery,
        total
    });
}));

// 📄 Admin - Documents Management
app.get('/admin/documents', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || '';
    const filter = searchQuery
        ? { title: { $regex: searchQuery, $options: 'i' } }
        : {};

    const documents = await User.find(filter)
        .populate('user', 'name email')
        .sort({ Currentdate: -1 })
        .skip(skip)
        .limit(limit);

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.render('admin/documents', {
        username: req.user.name,
        documents,
        currentPage: page,
        totalPages,
        searchQuery,
        total
    });
}));

// ⚡ Admin Actions
app.post('/admin/users/:id/toggle-role', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const user = await UserRegistration.findById(req.params.id);
    if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
    }

    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();

    req.flash('success', `User role updated to ${user.role}`);
    res.redirect('/admin/users');
}));

app.post('/admin/users/:id/toggle-status', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const user = await UserRegistration.findById(req.params.id);
    if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
    }

    user.isActive = !user.isActive;
    await user.save();

    req.flash('success', `User ${user.isActive ? 'activated' : 'deactivated'}`);
    res.redirect('/admin/users');
}));

app.post('/admin/documents/:id/toggle-privacy', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const document = await User.findById(req.params.id);
    if (!document) {
        req.flash('error', 'Document not found');
        return res.redirect('/admin/documents');
    }

    document.isPublic = !document.isPublic;
    await document.save();

    req.flash('success', `Document made ${document.isPublic ? 'public' : 'private'}`);
    res.redirect('/admin/documents');
}));

app.get('/admin/documents/:id/delete', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    req.flash('success', 'Document deleted successfully');
    res.redirect('/admin/documents');
}));


// 🚫 404 Handler
app.use((req, res) => {
    res.status(404).render('error', {
        error: "Page Not Found",
        message: "The page you're looking for doesn't exist"
    });
});

// 🚨 Global Error Handler
app.use((error, req, res, next) => {
    console.error(`❌ Error occurred: ${error.message}`);
    console.error(`Stack trace: ${error.stack}`);

    // Mongoose validation error
    if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(e => e.message);
        req.flash('error', errors.join(', '));
        return res.redirect('back');
    }

    // Mongoose duplicate key error
    if (error.code === 11000) {
        req.flash('error', 'A record with this information already exists');
        return res.redirect('back');
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        req.flash('error', 'Authentication failed. Please login again');
        return res.redirect('/login');
    }

    // Default error
    const statusCode = error.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : error.message;

    if (req.accepts('html')) {
        req.flash('error', 'Something went wrong. Please try again later.');
        res.redirect('/');
    } else {
        res.status(statusCode).json({
            error: "Server Error",
            message: message
        });
    }
});

// 🛡️ Graceful Shutdown Handling
process.on('SIGTERM', () => {
    console.log('📴 SIGTERM received, shutting down gracefully...');
    mongoose.connection.close(false, () => {
        console.log('📴 MongoDB connection closed.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📴 SIGINT received, shutting down gracefully...');
    mongoose.connection.close(false, () => {
        console.log('📴 MongoDB connection closed.');
        process.exit(0);
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.error('❌ Unhandled Promise Rejection:', err.message);
    mongoose.connection.close(false, () => {
        process.exit(1);
    });
});

// 🌍 Start the Server
if (require.main === module) {
    const server = app.listen(port, () => {
        console.log(`🚀 Server running at http://localhost:${port}`);
        console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Handle server errors
    server.on('error', (error) => {
        console.error('❌ Server error:', error);
    });
}

module.exports = app;
