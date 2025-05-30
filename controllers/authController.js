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
const UserProfile = require('../models/UserProfile');
const crypto = require('crypto');

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

        // Validate user credentials
        const user = await User.findByEmail(email);
        if (!user || !await User.verifyPassword(password, user.password)) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }

        // Create session
        req.session.user_id = user.id;
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        };

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
        res.redirect('/auth/login');
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
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array()[0].msg);
            return res.redirect('/auth/register');
        }

        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            req.flash('error', 'Email already registered');
            return res.redirect('/auth/register');
        }

        // Create new user
        const userId = await User.create({
            username,
            email,
            password,
            role: 'user'
        });

        // Create session
        req.session.user = {
            id: userId,
            username,
            email,
            role: 'user'
        };

        req.flash('success', 'Registration successful!');
        res.redirect('/');
    } catch (error) {
        console.error('Error in register:', error);
        req.flash('error', 'An error occurred during registration');
        res.redirect('/auth/register');
    }
};

// Handle logout
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
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
            return res.redirect('/auth/forgot-password');
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
        res.redirect('/auth/forgot-password');
    } catch (error) {
        console.error('Error in forgotPassword:', error);
        req.flash('error', 'Error processing request');
        res.redirect('/auth/forgot-password');
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
            return res.redirect('/auth/forgot-password');
        }

        res.render('auth/reset-password', {
            title: 'Reset Password',
            token,
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Error in showResetPassword:', error);
        req.flash('error', 'Error loading reset password page');
        res.redirect('/auth/forgot-password');
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
            return res.redirect('/auth/forgot-password');
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
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Error in resetPassword:', error);
        req.flash('error', 'Error resetting password');
        res.redirect('/auth/forgot-password');
    }
};

// Get login page
exports.getLogin = (req, res) => {
    res.render('auth/login', {
        title: 'Login',
        error: req.flash('error'),
        success: req.flash('success')
    });
};

// Get register page
exports.getRegister = (req, res) => {
    res.render('auth/register', {
        title: 'Register',
        error: req.flash('error'),
        success: req.flash('success')
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

// Process login
exports.postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);

        if (!user || !(await User.verifyPassword(password, user.password))) {
            req.flash('error', 'Invalid email or password');
            return res.redirect('/auth/login');
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        };

        res.redirect('/');
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'An error occurred during login');
        res.redirect('/auth/login');
    }
};

// Process forgot password
exports.postForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findByEmail(email);

        if (!user) {
            req.flash('error', 'No account found with that email');
            return res.redirect('/auth/forgot-password');
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = Date.now() + 3600000; // 1 hour

        await User.updateResetToken(user.id, resetToken, resetTokenExpires);

        // Send reset email
        // TODO: Implement email sending

        req.flash('success', 'Password reset instructions sent to your email');
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Forgot password error:', error);
        req.flash('error', 'An error occurred while processing your request');
        res.redirect('/auth/forgot-password');
    }
};

// Show reset password page
exports.getResetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findByResetToken(token);

        if (!user || user.resetTokenExpires < Date.now()) {
            req.flash('error', 'Invalid or expired reset token');
            return res.redirect('/auth/forgot-password');
        }

        res.render('auth/reset-password', {
            title: 'Reset Password',
            token,
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Reset password error:', error);
        req.flash('error', 'An error occurred while processing your request');
        res.redirect('/auth/forgot-password');
    }
};

// Process reset password
exports.postResetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        const user = await User.findByResetToken(token);

        if (!user || user.resetTokenExpires < Date.now()) {
            req.flash('error', 'Invalid or expired reset token');
            return res.redirect('/auth/forgot-password');
        }

        await User.updatePassword(user.id, password);
        await User.clearResetToken(user.id);

        req.flash('success', 'Password has been reset successfully');
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Reset password error:', error);
        req.flash('error', 'An error occurred while resetting your password');
        res.redirect('/auth/forgot-password');
    }
}; 