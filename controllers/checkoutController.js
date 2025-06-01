/**
 * Checkout Controller
 * Purpose: Handle order checkout process
 * Features:
 * - Process checkout
 * - Validate shipping information
 * - Process payment
 * - Create order
 * - Clear cart after successful order
 */

const User = require('../models/User');
const Profile = require('../models/profile');
const Address = require('../models/Address');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const Cart = require('../models/Cart');

// Constants
const SHIPPING_COST = 10;

// Helper functions
const calculateOrderTotals = (subtotal) => {
    return {
        subtotal: parseFloat(subtotal),
        shipping: SHIPPING_COST,
        total: parseFloat(subtotal) + SHIPPING_COST
    };
};

const formatOrderData = (userId, cartItems, totals, shippingInfo) => {
    return {
        userId,
        totalAmount: totals.total,
        shippingAddress: {
            firstName: shippingInfo.firstName,
            lastName: shippingInfo.lastName,
            email: shippingInfo.email,
            address: shippingInfo.address,
            city: shippingInfo.city,
            state: shippingInfo.state,
            zipCode: shippingInfo.zipCode
        },
        paymentMethod: 'Credit Card', // For now, hardcoded payment method
        status: 'pending'
    };
};

// Show checkout page
exports.getCheckout = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        const addresses = await Address.findByUserId(userId);
        const profile = await Profile.findByUserId(userId);

        // Lấy giỏ hàng từ session
        const cart = req.session.cart || [];
        
        // Tính toán tổng tiền
        let total = 0;
        for (const item of cart) {
            total += item.price * item.quantity;
        }

        res.render('shop/checkout', {
            title: 'Checkout',
            user: user,
            profile: profile,
            cart: cart,
            total: total,
            addresses: addresses
        });
    } catch (error) {
        console.error('Error in getCheckout:', error);
        req.flash('error', 'Có lỗi xảy ra khi tải trang thanh toán');
        res.redirect('/cart');
    }
};

// Process checkout
exports.processCheckout = async (req, res) => {
    try {
        const userId = req.user.id;
        const { addressId, paymentMethod, firstName, lastName, phone } = req.body;
        
        // Get cart items from database for logged-in users
        const cartItems = await Cart.getCartItems(userId);
        
        // Validate cart
        if (!cartItems.length) {
            req.flash('error', 'Giỏ hàng trống');
            return res.redirect('/cart');
        }

        // Validate required fields
        if (!addressId || !paymentMethod) {
            req.flash('error', 'Vui lòng chọn địa chỉ giao hàng và phương thức thanh toán');
            return res.redirect('/checkout');
        }

        // Validate address exists
        const address = await Address.findById(addressId);
        if (!address || address.userId !== userId) {
            req.flash('error', 'Địa chỉ giao hàng không hợp lệ');
            return res.redirect('/checkout');
        }

        // Check and update profile if needed
        let profile = await Profile.findByUserId(userId);
        if (!profile) {
            // Validate profile data
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                req.flash('error', errors.array()[0].msg);
                return res.redirect('/checkout');
            }

            // Create new profile
            await Profile.create({
                userId,
                firstName,
                lastName,
                phone
            });
        }

        // Calculate order total
        const subtotal = await Cart.getCartTotal(userId);
        const shippingCost = 10; // Fixed shipping cost
        const totalAmount = subtotal + shippingCost;

        // Create order with transaction
        try {
            const order = await Order.create({
                userId: userId,
                addressId: addressId,
                status: 'pending',
                paymentMethod: paymentMethod,
                totalAmount: totalAmount,
                items: cartItems.map(item => ({
                    productId: item.product_id,
                    quantity: item.quantity,
                    price: item.final_price || item.price
                }))
            });

            // Clear cart after successful order
            try {
                // Clear database cart
                await Cart.clearCart(userId);
                // Clear session cart
                req.session.cart = [];
                console.log(`Cart cleared for user ${userId} after successful order ${order.id}`);
            } catch (cartError) {
                console.error('Error clearing cart:', cartError);
                // Continue with order success even if cart clearing fails
            }

            // Set success message with order details
            req.flash('success', `Đặt hàng thành công! Mã đơn hàng: #${order.id}`);
            res.redirect(`/account/orders/${order.id}`);
        } catch (error) {
            console.error('Error creating order:', error);
            req.flash('error', 'Có lỗi xảy ra khi tạo đơn hàng: ' + error.message);
            res.redirect('/checkout');
        }
    } catch (error) {
        console.error('Error in processCheckout:', error);
        req.flash('error', 'Có lỗi xảy ra khi xử lý đơn hàng');
        res.redirect('/checkout');
    }
}; 