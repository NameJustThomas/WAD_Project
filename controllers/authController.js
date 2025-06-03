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
const sendEmail = require('../helpers/sendEmail'); // import your email helper

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
        const { identifier, password } = req.body;

        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array()[0].msg);
            return res.redirect('/login');
        }

        // Check if user exists by email or username
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [identifier, identifier]
        );

        if (!users.length) {
            req.flash('error', 'Invalid email or username or password');
            return res.redirect('/login');
        }

        const user = users[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error', 'Invalid email or username or password');
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

        if (req.session.checkoutIntent) {
            delete req.session.checkoutIntent;
            return res.redirect('/checkout');
        }

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
        const { username, email, password, confirm_password } = req.body;

        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array()[0].msg);
            return res.redirect('/register');
        }

        // Check if passwords match
        if (password !== confirm_password) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/register');
        }

        // Check if username exists
        const [existingUsernames] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUsernames.length) {
            req.flash('error', 'Username is already taken');
            return res.redirect('/register');
        }

        // Check if email exists
        const [existingEmails] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingEmails.length) {
            req.flash('error', 'Email is already registered');
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

        if (!result.insertId) {
            throw new Error('Failed to create user');
        }

        // Create profile for user
        await pool.query(
            'INSERT INTO profiles (user_id) VALUES (?)',
            [result.insertId]
        );

        // Set session
        req.session.user_id = result.insertId;
        req.session.user = {
            id: result.insertId,
            username,
            email,
            role: 'user'
        };
        res.locals.user = req.session.user;

        req.flash('success', 'Registration successful! Welcome to our shop.');
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

// Handle forgot password - only ONE function here!
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if user exists
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (!users.length) {
            req.flash('error', 'No account found with that email');
            return res.redirect('/forgot-password');
        }

        const user = users[0];

        // Generate reset token
        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Store token and expiry
        await pool.query(
            'UPDATE users SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?',
            [token, user.id]
        );

        // Build reset URL
        const resetUrl = `${process.env.FRONTEND_BASE_URL}/auth/reset-password/${token}`;

        // Prepare email content
        const message = `
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Click the link below to reset it. This link expires in 1 hour.</p>
            <a href="${resetUrl}">${resetUrl}</a>
            <p>If you did not request this, please ignore this email.</p>
        `;

        // Send the email
        await sendEmail({
            to: email,
            subject: 'Password Reset Instructions',
            html: message,
        });

        req.flash('success', 'Password reset instructions sent to your email');
        res.redirect('/forgot-password');
    } catch (error) {
        console.error('Error in forgotPassword:', error);
        req.flash('error', 'Error processing request. Please try again later.');
        res.redirect('/forgot-password');
    }
};

// Show reset password page
exports.showResetPassword = (req, res) => {
    res.render('/reset-password', {
        title: 'Reset Password',
        token: req.params.token,
        error: req.flash('error'),
        success: req.flash('success')
    });
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

// Get current user info (optional)
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