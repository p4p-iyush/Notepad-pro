require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');

// Import database connection
const connectDB = require('./config/database');

// Import security middleware
const { generalLimiter, authLimiter, helmetConfig } = require('./middleware/security');

// Import route handlers
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const documentRoutes = require('./routes/document');
const adminRoutes = require('./routes/admin');
const pdfRoutes = require('./routes/pdf'); // 📄 New PDF routes

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// 🛡️ Security Middleware
app.use(helmet(helmetConfig));

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// 🚦 Rate Limiting
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

// 🌟 Health Check Route
app.get('/health', (req, res) => {
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// 🌟 Routes
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/', documentRoutes);
app.use('/', adminRoutes);
app.use('/', pdfRoutes); // 📄 PDF conversion routes

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
    const mongoose = require('mongoose');
    mongoose.connection.close(false, () => {
        console.log('📴 MongoDB connection closed.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📴 SIGINT received, shutting down gracefully...');
    const mongoose = require('mongoose');
    mongoose.connection.close(false, () => {
        console.log('📴 MongoDB connection closed.');
        process.exit(0);
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.error('❌ Unhandled Promise Rejection:', err.message);
    const mongoose = require('mongoose');
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
