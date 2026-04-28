const UserService = require('../services/userService');
const jwtConfig = require('../config/jwt');
const { asyncHandler } = require('../middleware/auth');

class AuthController {
    // ✅ Login Page
    static getLoginPage = (req, res) => {
        res.render('login');
    };

    // ✅ Registration Page
    static getRegisterPage = (req, res) => {
        res.render('login'); // Using combined login/register page
    };

    // ✅ Login Route with Validation & Flash Messages
    static login = asyncHandler(async (req, res) => {
        const { username, password } = req.body;

        try {
            const { user, token } = await UserService.loginUser(username, password);

            // Store JWT in HTTP-only cookie
            res.cookie("token", token, jwtConfig.cookieOptions);

            // Flash message and redirect
            req.flash('success', `Welcome back, ${user.name}! Login successful.`);
            res.redirect('/');
        } catch (error) {
            req.flash('error', error.message);
            return res.redirect('/login');
        }
    });

    // ✅ Registration Route with Flash Messages
    static register = asyncHandler(async (req, res) => {
        const { name, email, password } = req.body;
    console.log('🔍 Registration attempt:', { name, email, password: '***' });
        try {
            await UserService.registerUser({ name, email, password });

            req.flash('success', 'Registration successful! Please login with your credentials.');
            res.redirect('/login');
        } catch (error) {
            req.flash('error', error.message);
            return res.redirect('/register');
        }
    });

    // ✅ Debug User Route
    static debugUser = (req, res) => {
        res.json({
            user: req.user,
            isAdmin: req.user?.role === 'admin',
            canAccessAdmin: req.user && req.user.role === 'admin'
        });
    };

    // ✅ Logout Route
    static logout = (req, res) => {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        req.flash('success', 'You have been logged out successfully');
        res.redirect('/');
    };
}

module.exports = AuthController;
