const express = require('express');
const router = express.Router();

// Import controllers and middleware
const AdminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Apply authentication and admin middleware to all routes
router.use(requireAuth);
router.use(requireAdmin);

// 📊 Admin Dashboard
router.get('/', AdminController.getDashboard);
router.get('/dashboard', AdminController.getDashboard);

// 👥 Admin - Users Management
router.get('/users', AdminController.getUsers);

// 📄 Admin - Documents Management
router.get('/documents', AdminController.getDocuments);

// ⚡ Admin Actions - User Management
router.post('/users/:id/toggle-role', AdminController.toggleUserRole);
router.post('/users/:id/toggle-status', AdminController.toggleUserStatus);

// ⚡ Admin Actions - Document Management
router.post('/documents/:id/toggle-privacy', AdminController.toggleDocumentPrivacy);
router.get('/documents/:id/delete', AdminController.deleteDocument);

module.exports = router;
