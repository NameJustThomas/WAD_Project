/**
 * Cart Routes
 * Purpose: Define shopping cart routes
 * Features:
 * - View cart
 * - Add to cart
 * - Update cart
 * - Remove from cart
 * - Clear cart
 * - Checkout
 */

const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { auth } = require('../middleware/auth');

// Cart page - không yêu cầu auth vì cho phép xem giỏ hàng khi chưa đăng nhập
router.get('/', (req, res) => cartController.index(req, res));

// API endpoints - không yêu cầu auth vì cho phép thao tác với session cart
router.get('/count', (req, res) => cartController.getCount(req, res));
router.post('/add/:productId', (req, res) => cartController.addItem(req, res));
router.put('/update/:productId', (req, res) => cartController.updateQuantity(req, res));
router.delete('/remove/:productId', (req, res) => cartController.removeItem(req, res));
router.delete('/clear', (req, res) => cartController.clearCart(req, res));

// Checkout - yêu cầu auth
router.post('/checkout', auth, (req, res) => cartController.checkout(req, res));

module.exports = router; 