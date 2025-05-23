/**
 * Order Model
 * Purpose: Handle order data and operations
 * Features:
 * - Order creation and management
 * - Order status tracking
 * - Order history
 * - Payment processing
 * - Order items management
 * - Order statistics
 */

const pool = require('../config/database');

class Order {
    static async findById(id) {
        const [orders] = await pool.query(`
            SELECT o.*, u.username as user_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `, [id]);
        return orders.length ? orders[0] : null;
    }

    static async findByUserId(userId) {
        const [orders] = await pool.query(`
            SELECT o.*, u.username as user_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        `, [userId]);
        return orders;
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

    static async findRecent(limit = 5) {
        try {
            const [orders] = await pool.query(`
                SELECT o.*, u.username as user_name
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                ORDER BY o.created_at DESC
                LIMIT ?
            `, [limit]);
            return orders;
        } catch (error) {
            console.error('Error in Order.findRecent:', error);
            throw error;
        }
    }

    static async count() {
        try {
            const [result] = await pool.query('SELECT COUNT(*) as total FROM orders');
            return result[0].total;
        } catch (error) {
            console.error('Error in Order.count:', error);
            throw error;
        }
    }

    static async create(orderData) {
        const { user_id, total_amount, status = 'pending', shipping_address } = orderData;
        const [result] = await pool.query(
            'INSERT INTO orders (user_id, total_amount, status, shipping_address) VALUES (?, ?, ?, ?)',
            [user_id, total_amount, status, shipping_address]
        );
        return result.insertId;
    }

    static async updateStatus(id, status) {
        const [result] = await pool.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, id]
        );
        return result.affectedRows > 0;
    }

    static async getOrderItems(orderId) {
        const [items] = await pool.query(`
            SELECT oi.*, p.name as product_name, p.image_url as image
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [orderId]);
        return items;
    }

    static async addOrderItem(orderId, itemData) {
        const { product_id, quantity, price } = itemData;
        const [result] = await pool.query(
            'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
            [orderId, product_id, quantity, price]
        );
        return result.insertId;
    }

    static async getStats() {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as totalOrders,
                SUM(total_amount) as totalRevenue,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingOrders,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedOrders
            FROM orders
        `);
        return stats[0];
    }

    static async getMonthlySales(months = 6) {
        const [sales] = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as orderCount,
                SUM(total_amount) as totalSales
            FROM orders
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
        `, [months]);
        return sales;
    }
}

module.exports = Order; 