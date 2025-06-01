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
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const userId = req.user.id;
        const { 
            address_id,
            payment_method,
            first_name,
            last_name,
            email,
            address,
            city,
            state,
            zip_code
        } = req.body;

        // Validate required fields
        if (!payment_method) {
            return res.status(400).json({
                success: false,
                message: 'Payment method is required'
            });
        }

        // Get shipping address
        let shippingAddress;
        if (address_id) {
            // Use existing address
            const [addresses] = await connection.query(
                'SELECT * FROM addresses WHERE id = ? AND user_id = ?',
                [address_id, userId]
            );
            if (!addresses.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid address selected'
                });
            }
            shippingAddress = addresses[0];
        } else {
            // Validate new address fields
            if (!first_name || !last_name || !email || !address || !city || !state || !zip_code) {
                return res.status(400).json({
                    success: false,
                    message: 'All address fields are required'
                });
            }

            // Create new address
            const [result] = await connection.query(
                `INSERT INTO addresses (
                    user_id, first_name, last_name, email, 
                    address, city, state, zip_code
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, first_name, last_name, email, address, city, state, zip_code]
            );
            shippingAddress = {
                id: result.insertId,
                first_name,
                last_name,
                email,
                address,
                city,
                state,
                zip_code
            };
        }

        // Format shipping address
        const formattedAddress = `${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip_code}`;

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