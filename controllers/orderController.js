/**
 * Order Controller
 * Purpose: Handle order related operations
 * Features:
 * - View order history
 * - View order details
 */

const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');

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
        const formattedOrder = {
            ...order,
            formatted_amount: parseFloat(order.total_amount || 0).toFixed(2),
            formatted_date: new Date(order.created_at).toLocaleDateString(),
            shipping_address: JSON.parse(order.shipping_address || '{}')
        };

        const formattedItems = orderItems.map(item => ({
            ...item,
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