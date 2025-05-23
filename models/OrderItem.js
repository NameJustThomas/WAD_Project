const pool = require('../config/database');

class OrderItem {
    static async create(orderId, productId, quantity, price) {
        const [result] = await pool.execute(
            'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
            [orderId, productId, quantity, price]
        );
        return result.insertId;
    }

    static async findByOrderId(orderId) {
        const [rows] = await pool.execute(
            'SELECT oi.*, p.name as product_name, p.image_url FROM order_items oi ' +
            'JOIN products p ON oi.product_id = p.id ' +
            'WHERE oi.order_id = ?',
            [orderId]
        );
        return rows;
    }

    static async getTopSellingProducts(limit = 5) {
        const [rows] = await pool.execute(
            'SELECT p.id, p.name, p.image_url, SUM(oi.quantity) as total_quantity, ' +
            'SUM(oi.quantity * oi.price) as total_revenue ' +
            'FROM order_items oi ' +
            'JOIN products p ON oi.product_id = p.id ' +
            'GROUP BY p.id, p.name, p.image_url ' +
            'ORDER BY total_quantity DESC ' +
            'LIMIT ?',
            [limit]
        );
        return rows;
    }

    static async getProductSalesByMonth(productId, year) {
        const [rows] = await pool.execute(
            'SELECT MONTH(oi.created_at) as month, ' +
            'SUM(oi.quantity) as total_quantity, ' +
            'SUM(oi.quantity * oi.price) as total_revenue ' +
            'FROM order_items oi ' +
            'WHERE oi.product_id = ? AND YEAR(oi.created_at) = ? ' +
            'GROUP BY MONTH(oi.created_at) ' +
            'ORDER BY month',
            [productId, year]
        );
        return rows;
    }
}

module.exports = OrderItem; 