/**
 * Checkout Routes
 * Purpose: Handle checkout related routes
 * Features:
 * - Show checkout page
 * - Process checkout
 */

const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');

// Validation middleware
const validateCheckout = [
    body('addressId').notEmpty().withMessage('Please select a shipping address'),
    body('paymentMethod').notEmpty().withMessage('Please select a payment method')
];

// Routes
router.get('/', auth, checkoutController.getCheckout);
router.post('/process', auth, validateCheckout, checkoutController.processCheckout);

module.exports = router; 