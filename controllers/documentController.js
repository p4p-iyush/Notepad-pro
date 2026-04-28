const DocumentService = require('../services/documentService');
const { asyncHandler } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

class DocumentController {
    // ✅ Save New Document
    static saveDocument = asyncHandler(async (req, res) => {
        const { title, content, isPublic } = req.body;

        try {
            const newDocument = await DocumentService.createDocument(
                { title, content, isPublic },
                req.user.id
            );

            req.flash('success', `Document "${title}" saved successfully!`);
            res.status(201).json({
                message: "Document saved successfully",
                documentId: newDocument._id
            });
        } catch (error) {
            res.status(400).json({
                error: "Failed to save document",
                message: error.message
            });
        }
    });

    // ✅ Edit Document Page
    static getEditPage = asyncHandler(async (req, res) => {
        try {
            const document = await DocumentService.getDocumentById(req.params.id);
            
            // Check ownership
            if (document.user._id.toString() !== req.user.id) {
                req.flash('error', 'You can only edit your own documents');
                return res.redirect('/api/dashboard');
            }

            res.render('edit', { text: document });
        } catch (error) {
            req.flash('error', error.message);
            res.redirect('/api/dashboard');
        }
    });

    // ✅ Update Document
    static updateDocument = asyncHandler(async (req, res) => {
        const { title, content, isPublic } = req.body;

        try {
            const updatedDocument = await DocumentService.updateDocument(
                req.params.id,
                { title, content, isPublic },
                req.user.id
            );

            res.json({
                message: "Document updated successfully",
                document: updatedDocument
            });
        } catch (error) {
            res.status(400).json({
                error: "Failed to update document",
                message: error.message
            });
        }
    });

    // ✅ Delete Document
    static deleteDocument = asyncHandler(async (req, res) => {
        try {
            const deletedDoc = await DocumentService.deleteDocument(req.params.id, req.user.id);

            req.flash('success', `Document "${deletedDoc.title}" deleted successfully.`);
            res.redirect('/api/dashboard');
        } catch (error) {
            req.flash('error', error.message);
            res.redirect('/api/dashboard');
        }
    });

    // ✅ View Document - Public or Private
    static viewDocument = asyncHandler(async (req, res) => {
        try {
            const document = await DocumentService.getDocumentById(req.params.id);

            // Check access permissions
            const token = req.cookies.token;
            let userId = null;

            if (token) {
                try {
                    const verified = jwt.verify(token, jwtConfig.secret);
                    userId = verified.id;
                } catch (error) {
                    // Token invalid, continue as anonymous user
                }
            }

            const hasAccess = DocumentService.checkDocumentAccess(document, userId);

            if (!hasAccess) {
                req.flash('error', 'This document is private and you do not have permission to view it');
                return res.redirect('/');
            }

            res.render('view', { text: document });
        } catch (error) {
            req.flash('error', error.message);
            res.redirect('/');
        }
    });
}

module.exports = DocumentController;
