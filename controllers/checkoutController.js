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
const pool = require('../config/database');

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

        // Get cart items from session
        const sessionCart = req.session.cart || [];
        console.log('Session cart in checkout:', sessionCart);

        if (!sessionCart || sessionCart.length === 0) {
            req.flash('error', 'Your cart is empty');
            return res.redirect('/cart');
        }

        // Format addresses for the template
        const savedAddresses = addresses.map(address => ({
            id: address.id,
            fullName: `${address.first_name} ${address.last_name}`,
            phone: profile.phone || '', // Use phone from profile
            email: profile.email || '', // Use email from profile
            address: address.address,
            city: address.city,
            state: address.state,
            zipCode: address.zip_code
        }));
        
        // Calculate totals
        let subtotal = 0;
        for (const item of sessionCart) {
            subtotal += (item.discount_price || item.price) * item.quantity;
        }
        const shipping = SHIPPING_COST;
        let total = subtotal + shipping;

        // Apply coupon discount if exists
        if (req.session.coupon) {
            const discount = req.session.coupon.discount_type === 'percent' 
                ? (subtotal * req.session.coupon.discount_value / 100)
                : req.session.coupon.discount_value;
            total -= Math.min(discount, subtotal);
        }

        res.render('shop/checkout', {
            title: 'Checkout',
            user: user,
            profile: profile,
            cartItems: sessionCart,
            subtotal: subtotal.toFixed(2),
            shipping: shipping.toFixed(2),
            total: total.toFixed(2),
            addresses: addresses,
            savedAddresses: savedAddresses,
            coupon: req.session.coupon
        });
    } catch (error) {
        console.error('Error in getCheckout:', error);
        req.flash('error', 'Có lỗi xảy ra khi tải trang thanh toán');
        res.redirect('/cart');
    }
};

// Process checkout
exports.processCheckout = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const userId = req.user.id;
        const { 
            shippingAddress,
            payment_method
        } = req.body;

        // Validate required fields
        if (!payment_method) {
            return res.status(400).json({
                success: false,
                message: 'Payment method is required'
            });
        }

        if (!shippingAddress) {
            return res.status(400).json({
                success: false,
                message: 'Shipping address is required'
            });
        }

        // Get cart items from session
        const cartItems = req.session.cart;
        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        // Calculate totals
        const subtotal = cartItems.reduce((total, item) => {
            const price = item.discount_price || item.price;
            return total + (parseFloat(price) * item.quantity);
        }, 0);
        const shipping = SHIPPING_COST;
        let total = subtotal + shipping;

        // Apply coupon discount if exists
        if (req.session.coupon) {
            const discount = req.session.coupon.discount_type === 'percent' 
                ? (subtotal * req.session.coupon.discount_value / 100)
                : req.session.coupon.discount_value;
            total -= Math.min(discount, subtotal);
        }

        // Format shipping address as JSON
        const formattedShippingAddress = {
            fullName: shippingAddress.fullName,
            address: shippingAddress.address,
            city: shippingAddress.city,
            state: shippingAddress.state,
            zipCode: shippingAddress.zipCode,
            phone: shippingAddress.phone,
            email: shippingAddress.email
        };

        // Create order
        const [orderResult] = await connection.query(
            `INSERT INTO orders (
                user_id,
                total_amount,
                shipping_address,
                payment_method,
                status
            ) VALUES (?, ?, ?, ?, ?)`,
            [userId, total, JSON.stringify(formattedShippingAddress), payment_method, 'pending']
        );

        const orderId = orderResult.insertId;

        // Add order items
        for (const item of cartItems) {
            const price = item.discount_price || item.price;
            await connection.query(
                `INSERT INTO order_items (
                    order_id, product_id, quantity, price
                ) VALUES (?, ?, ?, ?)`,
                [orderId, item.product_id, item.quantity, price]
            );

            // Update product stock
            await connection.query(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        // Clear cart
        req.session.cart = [];
        req.session.coupon = null;

        await connection.commit();

        res.json({
            success: true,
            message: 'Order placed successfully',
            orderId
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error in processCheckout:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing checkout'
        });
    } finally {
        connection.release();
    }
}; 