/**
 * Order Controller
 * Purpose: Handle order related operations
 * Features:
 * - View order history
 * - View order details
 * - Create new order
 */

const pool = require('../config/database');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Cart = require('../models/Cart');

// Create new order
exports.createOrder = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        console.log('=== Create Order Debug Info ===');
        console.log('User ID:', req.user.id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        console.log('Session Cart:', JSON.stringify(req.session.cart, null, 2));

        await connection.beginTransaction();

        const userId = req.user.id;
        const { shippingAddress, paymentMethod } = req.body;

        // Get cart items from session
        const cartItems = req.session.cart;
        if (!cartItems || !cartItems.length) {
            console.log('Cart is empty');
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        console.log('Cart Items:', JSON.stringify(cartItems, null, 2));

        // Calculate total amount including shipping
        const subtotal = cartItems.reduce((total, item) => {
            const price = item.discount_price || item.price;
            return total + (parseFloat(price) * item.quantity);
        }, 0);
        const shipping = 10.00; // Fixed shipping cost
        const totalAmount = subtotal + shipping;

        console.log('Subtotal:', subtotal);
        console.log('Shipping:', shipping);
        console.log('Total Amount:', totalAmount);

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

        console.log('Formatted Shipping Address:', JSON.stringify(formattedShippingAddress, null, 2));

        // Create order with properly formatted shipping address
        const orderId = await Order.create({
            userId,
            totalAmount,
            shippingAddress: JSON.stringify(formattedShippingAddress),
            paymentMethod,
            status: 'pending'
        });

        console.log('Created Order ID:', orderId);

        // Create order items
        for (const item of cartItems) {
            const price = item.discount_price || item.price;
            await OrderItem.create(
                orderId,
                item.product_id,
                item.quantity,
                price
            );
        }

        console.log('Created Order Items');

        // Clear cart
        req.session.cart = [];
        await connection.commit();

        console.log('=== End Create Order Debug Info ===');

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
        console.log('=== Get Orders Debug Info ===');
        console.log('User ID:', req.user.id);
        
        const userId = req.user.id;
        const orders = await Order.findByUserId(userId);
        
        console.log('Raw Orders Data:', JSON.stringify(orders, null, 2));
        
        // Format order data
        const formattedOrders = await Promise.all(orders.map(async order => {
            let shippingAddress = {};
            try {
                if (typeof order.shipping_address === 'string') {
                    shippingAddress = JSON.parse(order.shipping_address);
                } else if (order.shipping_address) {
                    shippingAddress = order.shipping_address;
                }
            } catch (error) {
                console.error('Error parsing shipping address:', error);
                shippingAddress = {
                    fullName: '',
                    address: order.shipping_address || '',
                    city: '',
                    state: '',
                    zipCode: '',
                    phone: '',
                    email: ''
                };
            }

            // Get order items
            const orderItems = await OrderItem.findByOrderId(order.id);
            const itemCount = orderItems.length;

            return {
                ...order,
                shipping_address: shippingAddress,
                formatted_amount: parseFloat(order.total_amount || 0).toFixed(2),
                formatted_date: new Date(order.created_at).toLocaleDateString(),
                item_count: itemCount
            };
        }));

        console.log('Formatted Orders:', JSON.stringify(formattedOrders, null, 2));
        console.log('=== End Get Orders Debug Info ===');

        res.render('account/orders', {
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
        console.log('=== Get Order Details Debug Info ===');
        console.log('Order ID:', req.params.id);
        console.log('User ID:', req.user.id);

        const orderId = req.params.id;
        const userId = req.user.id;

        // Get order
        const order = await Order.findById(orderId);
        console.log('Raw Order Data:', JSON.stringify(order, null, 2));

        if (!order || order.user_id !== userId) {
            console.log('Order not found or unauthorized');
            return res.status(404).render('error', {
                title: 'Error',
                message: 'Order not found',
                error: {}
            });
        }

        // Get order items
        const orderItems = await OrderItem.findByOrderId(orderId);
        console.log('Raw Order Items:', JSON.stringify(orderItems, null, 2));

        // Format data
        let shippingAddress = {};
        try {
            if (typeof order.shipping_address === 'string') {
                shippingAddress = JSON.parse(order.shipping_address);
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

        console.log('Formatted Order:', JSON.stringify(formattedOrder, null, 2));

        const formattedItems = orderItems.map(item => ({
            ...item,
            product_name: item.product_name || 'Unknown Product',
            image: item.image || '/images/products/no-image.jpg',
            formatted_price: parseFloat(item.price || 0).toFixed(2),
            formatted_total: (parseFloat(item.price || 0) * item.quantity).toFixed(2)
        }));

        console.log('Formatted Items:', JSON.stringify(formattedItems, null, 2));
        console.log('=== End Get Order Details Debug Info ===');

        res.render('account/order', {
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