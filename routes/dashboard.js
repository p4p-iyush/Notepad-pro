const express = require('express');
const router = express.Router();

// Import controllers and middleware
const DashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

// ✅ Homepage - Show Public Posts (Root route)
router.get('/', DashboardController.getHomepage);

// ✅ Dashboard - Protected Route
router.get('/dashboard', requireAuth, DashboardController.getDashboard);

// ✅ Text Editor Page
router.get('/editors', requireAuth, DashboardController.getTextEditor);

module.exports = router;
