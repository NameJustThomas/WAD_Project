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

const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Cart = require('../models/Cart');
const { validationResult } = require('express-validator');

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
exports.showCheckout = async (req, res) => {
    try {
        const userId = req.user.id;
        const cartItems = await Cart.getCartItems(userId);
        const subtotal = await Cart.getCartTotal(userId);
        const totals = calculateOrderTotals(subtotal);

        if (cartItems.length === 0) {
            req.flash('error', 'Your cart is empty');
            return res.redirect('/cart');
        }

        res.render('shop/checkout', {
            title: 'Checkout',
            cartItems,
            subtotal: totals.subtotal.toFixed(2),
            shipping: totals.shipping.toFixed(2),
            total: totals.total.toFixed(2)
        });
    } catch (error) {
        console.error('Error in showCheckout:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading checkout page',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// Process checkout
exports.processCheckout = async (req, res) => {
    try {
        const userId = req.user.id;
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            req.flash('error', errors.array()[0].msg);
            return res.redirect('/checkout');
        }

        // Get cart items and calculate totals
        const cartItems = await Cart.getCartItems(userId);
        const subtotal = await Cart.getCartTotal(userId);
        const totals = calculateOrderTotals(subtotal);

        if (cartItems.length === 0) {
            req.flash('error', 'Your cart is empty');
            return res.redirect('/cart');
        }

        // Create order
        const orderData = formatOrderData(userId, cartItems, totals, req.body);
        const orderId = await Order.create(orderData);

        // Create order items
        for (const item of cartItems) {
            await OrderItem.create(
                orderId,
                item.product_id,
                item.quantity,
                item.final_price
            );
        }

        // Clear cart
        await Cart.clearCart(userId);

        // Redirect to order confirmation
        res.redirect(`/orders/${orderId}`);
    } catch (error) {
        console.error('Error in processCheckout:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error processing checkout',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
}; 