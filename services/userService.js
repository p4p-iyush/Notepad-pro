const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserRegistration = require('../models/registration');
const User = require('../models/user');
const jwtConfig = require('../config/jwt');

class UserService {
    // 🔐 Authentication Services
    
    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} - Created user object
     */
    static async registerUser(userData) {
        const { name, email, password } = userData;

        // Check if user already exists
        const existingUserByEmail = await UserRegistration.findOne({ email });
        if (existingUserByEmail) {
            throw new Error('Email already registered. Please use a different email address.');
        }

        const existingUserByName = await UserRegistration.findOne({ name });
        if (existingUserByName) {
            throw new Error('Username already taken. Please choose a different username.');
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUser = await UserRegistration.create({
            name,
            email,
            password: hashedPassword
        });

        console.log(`✅ New user registered: ${newUser.name} (${newUser.email})`);
        return newUser;
    }

    /**
     * Authenticate user login
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise<Object>} - User object and token
     */
    static async loginUser(username, password) {
        // Find user by username
        const user = await UserRegistration.findOne({ name: username });
        if (!user) {
            throw new Error('Invalid username or password');
        }

        // Check if user is active
        if (user.isActive === false) {
            throw new Error('Account has been deactivated. Please contact support.');
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid username or password');
        }

        // Generate JWT Token
        const token = jwt.sign(
            { id: user._id, name: user.name },
            jwtConfig.secret,
            { expiresIn: jwtConfig.expiresIn }
        );

        return { user, token };
    }

    /**
     * Get user by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - User object
     */
    static async getUserById(userId) {
        const user = await UserRegistration.findById(userId).select('-password');
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    /**
     * Update user profile
     * @param {string} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} - Updated user object
     */
    static async updateUserProfile(userId, updateData) {
        const allowedUpdates = ['name', 'email'];
        const filteredUpdates = {};

        // Filter allowed updates
        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key)) {
                filteredUpdates[key] = updateData[key];
            }
        });

        const updatedUser = await UserRegistration.findByIdAndUpdate(
            userId,
            filteredUpdates,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            throw new Error('User not found');
        }

        return updatedUser;
    }

    // 📊 Admin Services

    /**
     * Get all users with pagination and search
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @param {string} searchQuery - Search query
     * @returns {Promise<Object>} - Users data with pagination info
     */
    static async getAllUsers(page = 1, limit = 10, searchQuery = '') {
        const skip = (page - 1) * limit;
        
        const filter = searchQuery
            ? {
                $or: [
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { email: { $regex: searchQuery, $options: 'i' } }
                ]
            }
            : {};

        const users = await UserRegistration.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await UserRegistration.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        // Get document count for each user
        const usersWithDocCount = await Promise.all(
            users.map(async (user) => {
                const docCount = await User.countDocuments({ user: user._id });
                return {
                    ...user.toObject(),
                    documentCount: docCount
                };
            })
        );

        return {
            users: usersWithDocCount,
            currentPage: page,
            totalPages,
            total,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };
    }

    /**
     * Toggle user role (admin/user)
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Updated user object
     */
    static async toggleUserRole(userId) {
        const user = await UserRegistration.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        user.role = user.role === 'admin' ? 'user' : 'admin';
        await user.save();

        return user;
    }

    /**
     * Toggle user status (active/inactive)
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Updated user object
     */
    static async toggleUserStatus(userId) {
        const user = await UserRegistration.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        user.isActive = !user.isActive;
        await user.save();

        return user;
    }

    /**
     * Get dashboard statistics
     * @returns {Promise<Object>} - Dashboard stats
     */
    static async getDashboardStats() {
        const totalUsers = await UserRegistration.countDocuments();
        const totalDocuments = await User.countDocuments();
        const publicDocuments = await User.countDocuments({ isPublic: true });
        const privateDocuments = await User.countDocuments({ isPublic: false });

        const recentUsers = await UserRegistration.find()
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(5);

        const recentDocuments = await User.find()
            .populate('user', 'name email')
            .sort({ Currentdate: -1 })
            .limit(5);

        return {
            stats: {
                totalUsers,
                totalDocuments,
                publicDocuments,
                privateDocuments
            },
            recentUsers,
            recentDocuments
        };
    }
}

module.exports = UserService;
