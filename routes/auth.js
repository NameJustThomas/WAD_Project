/**
 * Authentication Routes
 * Purpose: Define user authentication routes
 * Features:
 * - User registration
 * - User login
 * - Password reset
 * - Logout
 * - Session management
 */

const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const { guest } = require('../middleware/auth');

// Login routes
router.get('/login', guest, authController.showLogin);
router.post('/login', guest, authController.login);

// Register routes
router.get('/register', guest, authController.showRegister);
router.post('/register', guest, [
    check('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers and underscores'),
    check('email')
        .trim()
        .isEmail()
        .withMessage('Please enter a valid email')
        .normalizeEmail(),
    check('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/\d/)
        .withMessage('Password must contain at least one number')
        .matches(/[a-zA-Z]/)
        .withMessage('Password must contain at least one letter'),
    check('confirm_password')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
], authController.register);

// Logout route
router.get('/logout', authController.logout);

// Forgot Password routes
router.get('/forgot-password', guest, authController.showForgotPassword);
router.post(
  '/forgot-password',
  guest,
  [
    check('email', 'Please enter a valid email').isEmail().normalizeEmail()
  ],
  authController.forgotPassword
);

// Reset Password routes
router.get('/reset-password/:token', guest, authController.showResetPassword);
router.post(
  '/reset-password/:token',
  guest,
  [
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
  ],
  authController.resetPassword
);

module.exports = router;