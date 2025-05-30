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
router.post('/register', guest, authController.register);

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
