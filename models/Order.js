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
            await connection.beginTransaction();

            // Insert order
            const [orderResult] = await connection.query(
                `INSERT INTO orders (
                    user_id,
                    total_amount,
                    shipping_address,
                    payment_method,
                    status
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    orderData.userId,
                    orderData.totalAmount,
                    JSON.stringify(orderData.shippingAddress),
                    orderData.paymentMethod,
                    orderData.status
                ]
            );

            const orderId = orderResult.insertId;
            await connection.commit();
            return orderId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async updateStatus(id, status) {
        const [result] = await pool.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, parseInt(id)]
        );
        return result.affectedRows > 0;
    }
}

module.exports = Order; 