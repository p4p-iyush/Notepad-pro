const UserService = require('../services/userService');
const DocumentService = require('../services/documentService');
const { asyncHandler } = require('../middleware/auth');

class AdminController {
    // 📊 Admin Dashboard
    static getDashboard = asyncHandler(async (req, res) => {
        const dashboardData = await UserService.getDashboardStats();

        res.render('admin/dashboard', {
            username: req.user.name,
            ...dashboardData
        });
    });

    // 👥 Admin - Users Management
    static getUsers = asyncHandler(async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const searchQuery = req.query.search || '';

        const usersData = await UserService.getAllUsers(page, limit, searchQuery);

        res.render('admin/users', {
            username: req.user.name,
            ...usersData,
            searchQuery
        });
    });

    // 📄 Admin - Documents Management
    static getDocuments = asyncHandler(async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const searchQuery = req.query.search || '';

        const documentsData = await DocumentService.getAllDocuments(page, limit, searchQuery);

        res.render('admin/documents', {
            username: req.user.name,
            ...documentsData,
            searchQuery
        });
    });

    // ⚡ Admin Actions - Toggle User Role
    static toggleUserRole = asyncHandler(async (req, res) => {
        try {
            const user = await UserService.toggleUserRole(req.params.id);
            req.flash('success', `User role updated to ${user.role}`);
        } catch (error) {
            req.flash('error', error.message);
        }
        res.redirect('/users');
    });

    // ⚡ Admin Actions - Toggle User Status
    static toggleUserStatus = asyncHandler(async (req, res) => {
        try {
            const user = await UserService.toggleUserStatus(req.params.id);
            req.flash('success', `User ${user.isActive ? 'activated' : 'deactivated'}`);
        } catch (error) {
            req.flash('error', error.message);
        }
        res.redirect('/users');
    });

    // ⚡ Admin Actions - Toggle Document Privacy
    static toggleDocumentPrivacy = asyncHandler(async (req, res) => {
        try {
            const document = await DocumentService.toggleDocumentPrivacy(req.params.id);
            req.flash('success', `Document made ${document.isPublic ? 'public' : 'private'}`);
        } catch (error) {
            req.flash('error', error.message);
        }
        res.redirect('/documents');
    });

    // ⚡ Admin Actions - Delete Document
    static deleteDocument = asyncHandler(async (req, res) => {
        try {
            await DocumentService.adminDeleteDocument(req.params.id);
            req.flash('success', 'Document deleted successfully');
        } catch (error) {
            req.flash('error', error.message);
        }
        res.redirect('/documents');
    });
}

module.exports = AdminController;
