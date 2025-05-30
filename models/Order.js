/**
 * Order Model
 * Purpose: Handle order data and operations
 * Features:
 * - Order creation and management
 * - Order status tracking
 * - Order history
 */

const pool = require('../config/database');

class Order {
    constructor(id, userId, totalAmount, status, paymentMethod, addressId, createdAt) {
        this.id = id;
        this.userId = userId;
        this.totalAmount = totalAmount;
        this.status = status;
        this.paymentMethod = paymentMethod;
        this.addressId = addressId;
        this.created_at = createdAt;
    }

    static async findById(id) {
        try {
            // Get order details
            const [orders] = await pool.query(
                'SELECT * FROM orders WHERE id = ?',
                [id]
            );

            if (!orders.length) return null;

            const order = orders[0];

            // Get order items with product details
            const [items] = await pool.query(
                `SELECT oi.*, p.name as product_name, p.image_url as product_image 
                 FROM order_items oi 
                 JOIN products p ON oi.product_id = p.id 
                 WHERE oi.order_id = ?`,
                [id]
            );

            // Get shipping address
            const [addresses] = await pool.query(
                'SELECT * FROM addresses WHERE id = ?',
                [order.address_id]
            );

            return {
                ...order,
                items: items.map(item => ({
                    ...item,
                    product: {
                        name: item.product_name,
                        image: item.product_image
                    }
                })),
                address: addresses[0]
            };
        } catch (error) {
            console.error('Error in findById:', error);
            throw error;
        }
    }

    static async findByUserId(userId) {
        try {
            const [orders] = await pool.query(
                'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
                [userId]
            );
            return orders;
        } catch (error) {
            throw error;
        }
    }

    static async findAll() {
        const [orders] = await pool.query(`
            SELECT o.*, u.username as user_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
        `);
        return orders;
    }

    static async count() {
        const [result] = await pool.query('SELECT COUNT(*) as count FROM orders');
        return result[0].count;
    }

    static async findRecent(limit = 5) {
        const [orders] = await pool.query(`
            SELECT o.*, u.username as user_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT ?
        `, [parseInt(limit)]);
        return orders;
    }

    static async getLast30DaysStats() {
        const [result] = await pool.query(`
            SELECT 
                COUNT(*) as totalOrders,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingOrders,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedOrders,
                SUM(total_amount) as totalRevenue
            FROM orders
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        return result[0];
    }

    static async getMonthlySales(months = 6) {
        const [sales] = await pool.query(`
            SELECT 
                YEAR(created_at) as year,
                MONTH(created_at) as month,
                SUM(total_amount) as total
            FROM orders
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
            GROUP BY YEAR(created_at), MONTH(created_at)
            ORDER BY year DESC, month DESC
        `, [parseInt(months)]);
        return sales;
    }

    static async getSalesByDateRange(startDate, endDate) {
        const [sales] = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as order_count,
                SUM(total_amount) as total_revenue
            FROM orders
            WHERE created_at BETWEEN ? AND ?
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, [startDate, endDate]);
        return sales;
    }

    static async calculateTotalSales(startDate = null, endDate = null) {
        let query = `
            SELECT 
                COUNT(*) as total_orders,
                SUM(total_amount) as total_revenue,
                AVG(total_amount) as average_order_value
            FROM orders
        `;
        
        const params = [];
        if (startDate && endDate) {
            query += ' WHERE created_at BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        const [result] = await pool.query(query, params);
        return {
            total_orders: parseInt(result[0].total_orders) || 0,
            total_revenue: parseFloat(result[0].total_revenue) || 0,
            average_order_value: parseFloat(result[0].average_order_value) || 0
        };
    }

    static async getRecentOrders(limit = 5) {
        const [orders] = await pool.query(`
            SELECT 
                o.*,
                u.username as customer_name,
                COUNT(oi.id) as item_count,
                GROUP_CONCAT(p.name SEPARATOR ', ') as product_names
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ?
        `, [parseInt(limit)]);
        return orders;
    }

    static formatMonthlySalesData(sales) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formattedData = sales.map(sale => ({
            month: `${months[sale.month - 1]} ${sale.year}`,
            total: parseFloat(sale.total) || 0
        }));
        return formattedData;
    }

    static async create(orderData) {
        const connection = await pool.getConnection();
        try {
            console.log('Creating order with data:', orderData);

            // Validate required fields
            if (!orderData.userId || !orderData.addressId || !orderData.totalAmount || !orderData.items) {
                throw new Error('Missing required order data');
            }

            // Validate items
            if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
                throw new Error('Order must contain at least one item');
            }

            // Start transaction
            await connection.beginTransaction();

            try {
                // Create order
                const [orderResult] = await connection.query(
                    'INSERT INTO orders (user_id, total_amount, status, payment_method, address_id) VALUES (?, ?, ?, ?, ?)',
                    [
                        orderData.userId,
                        orderData.totalAmount,
                        orderData.status || 'pending',
                        orderData.paymentMethod,
                        orderData.addressId
                    ]
                );

                const orderId = orderResult.insertId;
                console.log(`Created order ${orderId} for user ${orderData.userId}`);

                // Create order items and update product stock
                for (const item of orderData.items) {
                    // Validate item data
                    if (!item.productId || !item.quantity || !item.price) {
                        throw new Error('Invalid item data');
                    }

                    // Check product stock
                    const [products] = await connection.query(
                        'SELECT stock FROM products WHERE id = ?',
                        [item.productId]
                    );

                    if (!products.length) {
                        throw new Error(`Product ${item.productId} not found`);
                    }

                    if (products[0].stock < item.quantity) {
                        throw new Error(`Insufficient stock for product ${item.productId}`);
                    }

                    // Create order item
                    await connection.query(
                        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                        [orderId, item.productId, item.quantity, item.price]
                    );

                    // Update product stock
                    await connection.query(
                        'UPDATE products SET stock = stock - ? WHERE id = ?',
                        [item.quantity, item.productId]
                    );

                    console.log(`Added item ${item.productId} to order ${orderId}`);
                }

                // Commit transaction
                await connection.commit();
                console.log(`Order ${orderId} created successfully`);

                // Return the created order
                return await this.findById(orderId);
            } catch (error) {
                // Rollback transaction on error
                await connection.rollback();
                console.error('Error creating order:', error);
                throw error;
            }
        } catch (error) {
            console.error('Error in order creation:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async updateStatus(id, status) {
        const connection = await pool.getConnection();
        try {
            console.log('Updating order status:', { id, status });

            // Validate status
            const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Invalid order status: ${status}`);
            }

            // Check if order exists
            const [orders] = await connection.query(
                'SELECT id FROM orders WHERE id = ?',
                [id]
            );

            if (!orders.length) {
                throw new Error(`Order not found with ID: ${id}`);
            }

            // Update status
            const [result] = await connection.query(
                'UPDATE orders SET status = ? WHERE id = ?',
                [status, id]
            );

            console.log('Update result:', result);

            if (result.affectedRows === 0) {
                throw new Error('Failed to update order status');
            }

            return true;
        } catch (error) {
            console.error('Error in updateStatus:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = Order; 