/**
 * Order Controller
 * Purpose: Handle order related operations
 * Features:
 * - View order history
 * - View order details
 * - Create new order
 */

const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Cart = require('../models/Cart');

// Create new order
exports.createOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const userId = req.user.id;
        const { shippingAddress, paymentMethod } = req.body;

        // Get cart items
        const cartItems = await Cart.getCartItems(userId);
        if (!cartItems.length) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        // Calculate total amount
        const totalAmount = cartItems.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);

        // Create order
        const orderId = await Order.create({
            userId,
            totalAmount,
            shippingAddress,
            paymentMethod,
            status: 'pending'
        });

        // Create order items
        for (const item of cartItems) {
            await OrderItem.create(
                orderId,
                item.product_id,
                item.quantity,
                item.price
            );
        }

        // Clear cart
        await Cart.clearCart(userId);

        await connection.commit();

        res.json({
            success: true,
            message: 'Order created successfully',
            orderId
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error in createOrder:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order'
        });
    } finally {
        connection.release();
    }
};

// Get user's orders
exports.getOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const orders = await Order.findByUserId(userId);
        
        // Format order data
        const formattedOrders = orders.map(order => ({
            ...order,
            formatted_amount: parseFloat(order.total_amount || 0).toFixed(2),
            formatted_date: new Date(order.created_at).toLocaleDateString()
        }));

        res.render('user/orders', {
            title: 'My Orders',
            orders: formattedOrders
        });
    } catch (error) {
        console.error('Error in getOrders:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading orders',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// Get order details
exports.getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.user.id;

        // Get order
        const order = await Order.findById(orderId);
        if (!order || order.user_id !== userId) {
            return res.status(404).render('error', {
                title: 'Error',
                message: 'Order not found',
                error: {}
            });
        }

        // Get order items
        const orderItems = await OrderItem.findByOrderId(orderId);

        // Format data
        let shippingAddress = {};
        try {
            if (typeof order.shipping_address === 'string') {
                // Try to parse as JSON first
                try {
                    shippingAddress = JSON.parse(order.shipping_address);
                } catch (parseError) {
                    // If not JSON, treat as plain text
                    shippingAddress = {
                        fullName: '',
                        address: order.shipping_address,
                        city: '',
                        state: '',
                        zipCode: '',
                        phone: '',
                        email: ''
                    };
                }
            } else if (order.shipping_address) {
                shippingAddress = order.shipping_address;
            }
        } catch (error) {
            console.error('Error handling shipping address:', error);
            shippingAddress = {
                fullName: '',
                address: 'Address not available',
                city: '',
                state: '',
                zipCode: '',
                phone: '',
                email: ''
            };
        }

        const formattedOrder = {
            ...order,
            formatted_amount: parseFloat(order.total_amount || 0).toFixed(2),
            formatted_date: new Date(order.created_at).toLocaleDateString(),
            shipping_address: shippingAddress
        };

        const formattedItems = orderItems.map(item => ({
            ...item,
            product_name: item.product_name || 'Unknown Product',
            image: item.image || '/images/products/no-image.jpg',
            formatted_price: parseFloat(item.price || 0).toFixed(2),
            formatted_total: (parseFloat(item.price || 0) * item.quantity).toFixed(2)
        }));

        res.render('user/order', {
            title: 'Order Details',
            order: formattedOrder,
            items: formattedItems
        });
    } catch (error) {
        console.error('Error in getOrderDetails:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading order details',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
}; 