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

        // Get cart items from session
        const cartItems = req.session.cart || [];
        
        // Calculate totals
        let subtotal = 0;
        for (const item of cartItems) {
            subtotal += item.price * item.quantity;
        }
        const shipping = SHIPPING_COST;
        const total = subtotal + shipping;

        res.render('shop/checkout', {
            title: 'Checkout',
            user: user,
            profile: profile,
            cartItems: cartItems,
            subtotal: subtotal,
            shipping: shipping,
            total: total,
            addresses: addresses,
            savedAddresses: savedAddresses
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

        // Format shipping address
        const formattedAddress = `${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}`;

        // Get cart items and calculate total
        const cartItems = await Cart.getCartItems(userId);
        const subtotal = await Cart.getCartTotal(userId);
        const shipping = 10; // Fixed shipping cost
        let total = subtotal + shipping;

        // Apply coupon discount if exists
        if (req.session.coupon) {
            const discount = req.session.coupon.discount_type === 'percent' 
                ? (subtotal * req.session.coupon.discount_value / 100)
                : req.session.coupon.discount_value;
            total -= Math.min(discount, subtotal);
        }

        // Create order
        const [orderResult] = await connection.query(
            `INSERT INTO orders (
                user_id,
                total_amount,
                shipping_address,
                payment_method,
                status
            ) VALUES (?, ?, ?, ?, ?)`,
            [userId, total, formattedAddress, payment_method, 'pending']
        );

        const orderId = orderResult.insertId;

        // Add order items
        for (const item of cartItems) {
            await connection.query(
                `INSERT INTO order_items (
                    order_id, product_id, quantity, price
                ) VALUES (?, ?, ?, ?)`,
                [orderId, item.product_id, item.quantity, item.price]
            );

            // Update product stock
            await connection.query(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }

        // Clear cart
        await Cart.clearCart(userId);
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