const PDFService = require('../services/pdfService');
const { asyncHandler } = require('../middleware/auth');

class PDFController {
    // ✅ PDF Upload Page
    static getUploadPage = (req, res) => {
        res.render('upload');
    };

    // ✅ Convert PDF to HTML
    static convertPDF = asyncHandler(async (req, res) => {
        try {
            // Validate uploaded file
            PDFService.validatePDFFile(req.file);

            // Convert PDF to HTML
            const htmlContent = await PDFService.convertPDFToHTML(req.file.path);
            
            // Clean up uploaded file
            PDFService.cleanupFile(req.file.path);
            
            // Render result page with HTML content
            res.render('result', { 
                htmlContent: htmlContent,
                originalName: req.file.originalname 
            });
            
        } catch (error) {
            // Clean up file if it exists
            if (req.file && req.file.path) {
                PDFService.cleanupFile(req.file.path);
            }
            
            console.error('PDF conversion error:', error);
            req.flash('error', error.message || 'Error converting PDF');
            res.redirect('/');
        }
    });

    // ✅ Get conversion history (future feature)
    static getConversionHistory = asyncHandler(async (req, res) => {
        // This can be implemented in the future to show user's conversion history
        res.render('pdf/history', {
            username: req.user ? req.user.name : null,
            conversions: [] // Empty for now
        });
    });
}

module.exports = PDFController;
