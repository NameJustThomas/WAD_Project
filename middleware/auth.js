const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication Middleware
 * Purpose: Handle user authentication and authorization
 * Features:
 * - User authentication check
 * - Role-based access control
 * - Session validation
 * - Protected route handling
 * - Admin access control
 */

const isGuest = (req, res, next) => {
    if (req.session && req.session.user) {
        return res.redirect('/');
    }
    next();
};

const isAuthenticated = async (req, res, next) => {
    try {
        // Check if session exists and has user_id
        if (!req.session || !req.session.user_id) {
            // Store the intended destination
            req.session.returnTo = req.originalUrl;
            return res.redirect('/auth/login');
        }

        // Get user from database
        const [users] = await pool.query(
            'SELECT id, username, email, role FROM users WHERE id = ?',
            [req.session.user_id]
        );

        if (!users.length) {
            // Clear invalid session
            req.session.destroy();
            return res.redirect('/auth/login');
        }

        // Set user in request object
        req.user = users[0];
        next();
    } catch (error) {
        console.error('Error in authentication middleware:', error);
        res.status(500).render('error', {
            title: 'Error Authenticating User',
            message: 'Error authenticating user',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

const isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).render('error', {
            title: 'Access Denied',
            message: 'You do not have permission to access this page',
            error: {}
        });
    }
    next();
};

const isNotAuthenticated = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return next();
    }
    res.redirect('/');
};

// Middleware to check authentication for cart operations
const requireAuthForCart = async (req, res, next) => {
    try {
        if (!req.session || !req.session.user_id) {
            // Store the intended cart action
            req.session.returnTo = '/cart';
            return res.redirect('/auth/login');
        }

        // Get user from database
        const [users] = await pool.query(
            'SELECT id, username, email, role FROM users WHERE id = ?',
            [req.session.user_id]
        );

        if (!users.length) {
            // Clear invalid session
            req.session.destroy();
            return res.redirect('/auth/login');
        }

        // Set user in request object
        req.user = users[0];
        next();
    } catch (error) {
        console.error('Error in cart authentication middleware:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error processing cart operation',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// Authentication middleware
const auth = async (req, res, next) => {
    try {
        // Check if session exists and has user_id
        if (!req.session || !req.session.user_id) {
            // Store the intended destination
            req.session.returnTo = req.originalUrl;
            return res.redirect('/auth/login');
        }

        // Get user from database
        const [users] = await pool.query(
            'SELECT id, username, email, role FROM users WHERE id = ?',
            [req.session.user_id]
        );

        if (!users.length) {
            // Clear invalid session
            req.session.destroy();
            return res.redirect('/auth/login');
        }

        // Set user in request object
        req.user = users[0];
        res.locals.user = users[0]; // Add user to res.locals for views
        next();
    } catch (error) {
        console.error('Error in authentication middleware:', error);
        res.status(500).render('error', {
            title: 'Error Authenticating User',
            message: 'Error authenticating user',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// Guest middleware - redirects authenticated users
const guest = (req, res, next) => {
    if (req.session && req.session.user_id) {
        return res.redirect('/');
    }
    next();
};

module.exports = {
    isGuest,
    isAuthenticated,
    isAdmin,
    isNotAuthenticated,
    requireAuthForCart,
    auth,
    guest
}; 