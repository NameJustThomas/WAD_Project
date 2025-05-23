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
        `, [parseInt(id)]);
        return orders.length ? orders[0] : null;
    }

    static async findByUserId(userId) {
        const [orders] = await pool.query(`
            SELECT o.*, u.username as user_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        `, [parseInt(userId)]);
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
            `, [parseInt(limit)]);
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
            [parseInt(user_id), parseFloat(total_amount), status, shipping_address]
        );
        return result.insertId;
    }

    static async updateStatus(id, status) {
        const [result] = await pool.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, parseInt(id)]
        );
        return result.affectedRows > 0;
    }

    static async getOrderItems(orderId) {
        const [items] = await pool.query(`
            SELECT oi.*, p.name as product_name, p.image_url as image
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [parseInt(orderId)]);
        return items;
    }

    static async addOrderItem(orderId, itemData) {
        const { product_id, quantity, price } = itemData;
        const [result] = await pool.query(
            'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
            [parseInt(orderId), parseInt(product_id), parseInt(quantity), parseFloat(price)]
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

    static async getLast30DaysStats() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as totalOrders,
                COALESCE(SUM(total_amount), 0) as totalRevenue,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingOrders,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedOrders
            FROM orders
            WHERE created_at >= ?
        `, [thirtyDaysAgo]);
        
        return {
            totalOrders: parseInt(stats[0].totalOrders || 0),
            totalRevenue: parseFloat(stats[0].totalRevenue || 0),
            pendingOrders: parseInt(stats[0].pendingOrders || 0),
            completedOrders: parseInt(stats[0].completedOrders || 0)
        };
    }

    static async getMonthlySales(months = 6) {
        const [rows] = await pool.query(`
            SELECT 
                YEAR(created_at) as year,
                MONTH(created_at) as month,
                COALESCE(SUM(total_amount), 0) as total
            FROM orders
            WHERE status = 'completed'
            AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
            GROUP BY YEAR(created_at), MONTH(created_at)
            ORDER BY year, month
        `, [parseInt(months)]);
        return rows;
    }

    static formatMonthlySalesData(salesData) {
        return salesData.map(item => ({
            month: new Date(item.year, item.month - 1).toLocaleString('default', { month: 'short' }),
            total: parseFloat(item.total || 0)
        }));
    }

    static async getSalesByDateRange(startDate, endDate) {
        const [rows] = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m-%d') as date,
                COALESCE(SUM(total_amount), 0) as total_amount
            FROM orders
            WHERE status = 'completed'
            AND created_at BETWEEN ? AND ?
            GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
            ORDER BY date
        `, [startDate, endDate]);
        return rows;
    }

    static calculateTotalSales(salesData) {
        const total = salesData.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
        return total.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    static async getFilteredSales(filters) {
        let query = `
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as orderCount,
                SUM(total_amount) as totalSales
            FROM orders
            WHERE 1=1
        `;
        const params = [];

        if (filters.startDate) {
            query += ' AND created_at >= ?';
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            query += ' AND created_at <= ?';
            params.push(filters.endDate);
        }
        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        query += ' GROUP BY DATE_FORMAT(created_at, "%Y-%m") ORDER BY month ASC';

        const [sales] = await pool.query(query, params);
        return sales;
    }

    static async getRecentOrders(limit = 5) {
        const [orders] = await pool.query(`
            SELECT o.*, u.username as user_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT ?
        `, [parseInt(limit)]);

        return orders.map(order => ({
            id: order.id,
            user_name: order.user_name || 'Guest',
            total_amount: parseFloat(order.total_amount || 0).toFixed(2),
            status: order.status,
            created_at: new Date(order.created_at).toLocaleDateString()
        }));
    }
}

module.exports = Order; 