const express = require('express');
const router = express.Router();

// Import controllers and middleware
const DocumentController = require('../controllers/documentController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validationRules, handleValidationErrors } = require('../middleware/validation');

// ✅ Save New Document
router.post('/save',
    requireAuth,
    validationRules.document,
    handleValidationErrors,
    DocumentController.saveDocument
);

// ✅ Edit Document Page
router.get('/edit/:id',
    validationRules.mongoId,
    handleValidationErrors,
    requireAuth,
    DocumentController.getEditPage
);

// ✅ Update Document
router.post('/update/:id',
    validationRules.mongoId,
    validationRules.documentUpdate,
    handleValidationErrors,
    requireAuth,
    DocumentController.updateDocument
);

// ✅ Delete Document
router.get('/delete/:id',
    validationRules.mongoId,
    handleValidationErrors,
    requireAuth,
    DocumentController.deleteDocument
);

// ✅ View Document - Public or Private
router.get('/view/:id',
    validationRules.mongoId,
    handleValidationErrors,
    optionalAuth,
    DocumentController.viewDocument
);

module.exports = router;
