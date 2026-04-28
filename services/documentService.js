const User = require('../models/user');

class DocumentService {
    /**
     * Create a new document
     * @param {Object} documentData - Document data
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Created document
     */
    static async createDocument(documentData, userId) {
        const { title, content, isPublic } = documentData;

        const newDocument = await User.create({
            title: title.trim(),
            content: content.trim(),
            isPublic: Boolean(isPublic),
            user: userId,
            Currentdate: new Date()
        });

        console.log(`📝 New document created: "${title}" by user ${userId}`);
        return newDocument;
    }

    /**
     * Get user's documents
     * @param {string} userId - User ID
     * @param {number} limit - Number of documents to fetch
     * @returns {Promise<Array>} - User documents
     */
    static async getUserDocuments(userId, limit = 100) {
        const userDocuments = await User.find({ user: userId })
            .sort({ Currentdate: -1 })
            .limit(limit);

        return userDocuments;
    }

    /**
     * Get public documents
     * @param {number} limit - Number of documents to fetch
     * @returns {Promise<Array>} - Public documents
     */
    static async getPublicDocuments(limit = 50) {
        const publicDocuments = await User.find({ isPublic: true })
            .sort({ Currentdate: -1 })
            .populate('user', 'name')
            .limit(limit);

        return publicDocuments;
    }

    /**
     * Get document by ID
     * @param {string} documentId - Document ID
     * @returns {Promise<Object>} - Document object
     */
    static async getDocumentById(documentId) {
        const document = await User.findById(documentId).populate('user', 'name');
        
        if (!document) {
            throw new Error('Document not found or has been deleted');
        }

        return document;
    }

    /**
     * Update document
     * @param {string} documentId - Document ID
     * @param {Object} updateData - Data to update
     * @param {string} userId - User ID (for ownership check)
     * @returns {Promise<Object>} - Updated document
     */
    static async updateDocument(documentId, updateData, userId) {
        const document = await User.findById(documentId);
        
        if (!document) {
            throw new Error('Document not found');
        }

        if (document.user.toString() !== userId) {
            throw new Error('You can only update your own documents');
        }

        const { title, content, isPublic } = updateData;

        const updateFields = {
            content: content.trim(),
            Currentdate: new Date()
        };

        // Only update title if provided
        if (title !== undefined) {
            updateFields.title = title.trim();
        }

        // Only update isPublic if provided
        if (isPublic !== undefined) {
            updateFields.isPublic = Boolean(isPublic);
        }

        const updatedDocument = await User.findByIdAndUpdate(
            documentId,
            updateFields,
            { new: true, runValidators: true }
        );

        console.log(`📝 Document updated: "${updatedDocument.title}" by user ${userId}`);
        return updatedDocument;
    }

    /**
     * Delete document
     * @param {string} documentId - Document ID
     * @param {string} userId - User ID (for ownership check)
     * @returns {Promise<Object>} - Deleted document info
     */
    static async deleteDocument(documentId, userId) {
        const document = await User.findById(documentId);
        
        if (!document) {
            throw new Error('Document not found');
        }

        if (document.user.toString() !== userId) {
            throw new Error('You can only delete your own documents');
        }

        const documentTitle = document.title;
        await User.findByIdAndDelete(documentId);

        console.log(`🗑️ Document deleted: ${documentId} by user ${userId}`);
        return { title: documentTitle };
    }

    /**
     * Check document access permissions
     * @param {Object} document - Document object
     * @param {string} userId - User ID (optional)
     * @returns {boolean} - Whether user can access document
     */
    static checkDocumentAccess(document, userId = null) {
        // Public documents can be accessed by anyone
        if (document.isPublic) {
            return true;
        }

        // Private documents can only be accessed by owner
        if (userId && document.user._id.toString() === userId) {
            return true;
        }

        return false;
    }

    // 📊 Admin Services

    /**
     * Get all documents with pagination and search (Admin)
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @param {string} searchQuery - Search query
     * @returns {Promise<Object>} - Documents data with pagination info
     */
    static async getAllDocuments(page = 1, limit = 10, searchQuery = '') {
        const skip = (page - 1) * limit;
        
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

        return {
            documents,
            currentPage: page,
            totalPages,
            total,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };
    }

    /**
     * Toggle document privacy (Admin)
     * @param {string} documentId - Document ID
     * @returns {Promise<Object>} - Updated document
     */
    static async toggleDocumentPrivacy(documentId) {
        const document = await User.findById(documentId);
        if (!document) {
            throw new Error('Document not found');
        }

        document.isPublic = !document.isPublic;
        await document.save();

        return document;
    }

    /**
     * Delete document (Admin)
     * @param {string} documentId - Document ID
     * @returns {Promise<void>}
     */
    static async adminDeleteDocument(documentId) {
        const result = await User.findByIdAndDelete(documentId);
        if (!result) {
            throw new Error('Document not found');
        }
    }
}

module.exports = DocumentService;
