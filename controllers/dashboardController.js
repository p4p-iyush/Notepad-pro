const DocumentService = require('../services/documentService');
const { asyncHandler } = require('../middleware/auth');

class DashboardController {
    // ✅ Homepage - Show Public Posts
    static getHomepage = asyncHandler(async (req, res) => {
        try {
            const allText = await DocumentService.getPublicDocuments(50);
            res.render('index', { allText, username: null });
        } catch (error) {
            console.error("Error fetching public notes:", error);
            req.flash('error', 'Unable to load public notes. Please try again later.');
            res.render('index', { allText: [], username: null });
        }
    });

    // ✅ Dashboard - Protected Route
    static getDashboard = asyncHandler(async (req, res) => {
        const userDocuments = await DocumentService.getUserDocuments(req.user.id, 100);

        res.render('index', {
            username: req.user.name,
            allText: userDocuments
        });
    });

    // ✅ Text Editor Page
    static getTextEditor = (req, res) => {
        res.render('text_editor');
    };
}

module.exports = DashboardController;
