const fs = require('fs');
const pdf2html = require('pdf2html');

class PDFService {
    /**
     * Convert PDF file to HTML
     * @param {string} filePath - Path to the PDF file
     * @returns {Promise<string>} - HTML content
     */
    static async convertPDFToHTML(filePath) {
        try {
            // Convert PDF to HTML
            const htmlContent = await pdf2html.html(filePath);
            return htmlContent;
        } catch (error) {
            console.error('PDF conversion error:', error);
            throw new Error('Failed to convert PDF to HTML');
        }
    }

    /**
     * Clean up uploaded file
     * @param {string} filePath - Path to the file to delete
     */
    static cleanupFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`✅ Cleaned up file: ${filePath}`);
            }
        } catch (error) {
            console.error(`❌ Error cleaning up file ${filePath}:`, error);
        }
    }

    /**
     * Validate PDF file
     * @param {Object} file - Multer file object
     * @returns {boolean} - Whether file is valid
     */
    static validatePDFFile(file) {
        if (!file) {
            throw new Error('No PDF file uploaded');
        }

        if (file.mimetype !== 'application/pdf') {
            throw new Error('Only PDF files are allowed');
        }

        // Check file size (limit to 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            throw new Error('File size exceeds 10MB limit');
        }

        return true;
    }
}

module.exports = PDFService;
