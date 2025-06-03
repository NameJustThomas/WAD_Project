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

// Proceed to checkout
router.get('/checkout', (req, res) => {
    // Kiểm tra giỏ hàng
    if (!req.session.cart || req.session.cart.length === 0) {
        req.flash('error', 'Your cart is empty');
        return res.redirect('/cart');
    }

    // Nếu chưa đăng nhập, chuyển hướng đến trang login
    if (!req.user) {
        req.session.returnTo = '/checkout';
        return res.redirect('/login');
    }

    // Nếu đã đăng nhập, chuyển đến trang checkout
    res.redirect('/checkout');
});

module.exports = router;