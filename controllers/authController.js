/**
 * Authentication Controller
 * Purpose: Handle user authentication and authorization
 * Features:
 * - User registration
 * - User login
 * - Password reset
 * - Session management
 * - User profile
 * - Logout
 */

const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// Show login page
exports.showLogin = (req, res) => {
    const error = req.flash('error');
    res.render('auth/login', {
        title: 'Login',
        error: error.length > 0 ? error[0] : null
    });
};

// Handle login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array()[0].msg);
            return res.redirect('/login');
        }

        // Check if user exists
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (!users.length) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/login');
        }

        const user = users[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/login');
        }

        // Set session
        req.session.user_id = user.id;
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        };
        res.locals.user = req.session.user;

        // Check if there was a checkout intent
        if (req.session.checkoutIntent) {
            delete req.session.checkoutIntent;
            return res.redirect('/checkout');
        }

        // Redirect to intended page or home
        const returnTo = req.session.returnTo || '/';
        delete req.session.returnTo;
        res.redirect(returnTo);
    } catch (error) {
        console.error('Error in login:', error);
        req.flash('error', 'An error occurred during login. Please try again.');
        res.redirect('/login');
    }
};

// Show register page
exports.showRegister = (req, res) => {
    const error = req.flash('error');
    res.render('auth/register', {
        title: 'Register',
        error: error.length > 0 ? error[0] : null
    });
};

// Handle registration
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array()[0].msg);
            return res.redirect('/register');
        }

        // Check if user exists
        const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length) {
            req.flash('error', 'This email is already registered');
            return res.redirect('/register');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, 'user']
        );

        // Set session
        req.session.user_id = result.insertId;
        req.session.user = {
            id: result.insertId,
            username,
            email,
            role: 'user'
        };

        res.redirect('/');
    } catch (error) {
        console.error('Error in register:', error);
        req.flash('error', 'An error occurred during registration. Please try again.');
        res.redirect('/register');
    }
};

// Handle logout
exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/login');
};

// Show forgot password page
exports.showForgotPassword = (req, res) => {
    res.render('auth/forgot-password', {
        title: 'Forgot Password',
        error: req.flash('error'),
        success: req.flash('success')
    });
};

// Handle forgot password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if user exists
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (!users.length) {
            req.flash('error', 'No account found with that email');
            return res.redirect('/forgot-password');
        }

        // Generate reset token
        const token = jwt.sign(
            { id: users[0].id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Store token in database
        await pool.query(
            'UPDATE users SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?',
            [token, users[0].id]
        );

        // TODO: Send reset email

        req.flash('success', 'Password reset instructions sent to your email');
        res.redirect('/forgot-password');
    } catch (error) {
        console.error('Error in forgotPassword:', error);
        req.flash('error', 'Error processing request');
        res.redirect('/forgot-password');
    }
};

// Show reset password page
exports.showResetPassword = async (req, res) => {
    try {
        const { token } = req.params;

        // Check if token is valid
        const [users] = await pool.query(
            'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
            [token]
        );

        if (!users.length) {
            req.flash('error', 'Invalid or expired reset token');
            return res.redirect('/forgot-password');
        }

        res.render('auth/reset-password', {
            title: 'Reset Password',
            token,
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Error in showResetPassword:', error);
        req.flash('error', 'Error loading reset password page');
        res.redirect('/forgot-password');
    }
};

// Handle reset password
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Check if token is valid
        const [users] = await pool.query(
            'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
            [token]
        );

        if (!users.length) {
            req.flash('error', 'Invalid or expired reset token');
            return res.redirect('/forgot-password');
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update password and clear reset token
        await pool.query(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [hashedPassword, users[0].id]
        );

        req.flash('success', 'Password has been reset');
        res.redirect('/login');
    } catch (error) {
        console.error('Error in resetPassword:', error);
        req.flash('error', 'Error resetting password');
        res.redirect('/forgot-password');
    }
};

// Get login page
exports.getLogin = (req, res, next) => {
    res.render('auth/login', {
        title: 'Login',
        errors: [],
        formData: {}
    });
};

// Get register page
exports.getRegister = (req, res, next) => {
    res.render('auth/register', {
        title: 'Register',
        errors: [],
        formData: {}
    });
};

// Get current user
exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        });
    } catch (error) {
        console.error('Error in getCurrentUser:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 