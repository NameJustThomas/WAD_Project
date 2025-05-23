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

// Authentication routes
router.get('/login', guest, (req, res) => authController.showLogin(req, res));
router.post('/login', guest, (req, res) => authController.login(req, res));
router.get('/register', guest, (req, res) => authController.showRegister(req, res));
router.post('/register', guest, (req, res) => authController.register(req, res));
router.get('/logout', (req, res) => authController.logout(req, res));

// Password reset routes
router.get('/forgot-password', guest, (req, res) => authController.showForgotPassword(req, res));
router.post('/forgot-password', guest, (req, res) => authController.forgotPassword(req, res));
router.get('/reset-password/:token', guest, (req, res) => authController.showResetPassword(req, res));
router.post('/reset-password/:token', guest, (req, res) => authController.resetPassword(req, res));

module.exports = router; 