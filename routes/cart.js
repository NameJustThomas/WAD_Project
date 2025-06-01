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
router.get('/', cartController.index);

// API endpoints - không yêu cầu auth vì cho phép thao tác với session cart
router.get('/count', cartController.getCount);
router.post('/add/:productId', cartController.addItem);
router.put('/update/:productId', cartController.updateQuantity);
router.delete('/remove/:productId', cartController.removeItem);
router.delete('/clear', cartController.clearCart);

// Checkout - không yêu cầu auth để cho phép chuyển hướng đến login
router.post('/checkout', cartController.checkout);

// Apply coupon
router.post('/apply-coupon', cartController.applyCoupon);

module.exports = router;