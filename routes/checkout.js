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
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').trim().isEmail().withMessage('Please enter a valid email'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('zipCode').trim().notEmpty().withMessage('Zip code is required'),
    body('cardName').trim().notEmpty().withMessage('Name on card is required'),
    body('cardNumber').trim().notEmpty().withMessage('Card number is required'),
    body('expiryDate').trim().notEmpty().withMessage('Expiry date is required'),
    body('cvv').trim().notEmpty().withMessage('CVV is required')
];

// Routes
router.get('/', auth, checkoutController.showCheckout);
router.post('/process', auth, validateCheckout, checkoutController.processCheckout);

module.exports = router; 