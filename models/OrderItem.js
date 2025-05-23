/**
 * OrderItem Model
 * Purpose: Handle order item data and operations
 * Features:
 * - Create order items
 * - Find order items by order ID
 * - Get top selling products
 * - Get product sales by month
 */

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
        const limitValue = parseInt(limit) || 5;
        const [rows] = await pool.query(
            'SELECT p.id, p.name, p.image_url, ' +
            'CAST(SUM(oi.quantity) AS SIGNED) as total_quantity, ' +
            'CAST(SUM(oi.quantity * oi.price) AS DECIMAL(10,2)) as total_revenue ' +
            'FROM order_items oi ' +
            'JOIN products p ON oi.product_id = p.id ' +
            'GROUP BY p.id, p.name, p.image_url ' +
            'ORDER BY total_quantity DESC ' +
            `LIMIT ${limitValue}`
        );
        return rows;
    }

    static formatProductsData(productsData) {
        return productsData.map(item => ({
            name: item.name,
            quantity: parseInt(item.total_quantity || 0),
            revenue: parseFloat(item.total_revenue || 0).toFixed(2)
        }));
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
            [parseInt(productId), parseInt(year)]
        );
        return rows;
    }

    static async getTopSellingProductsByDateRange(startDate, endDate, limit = 5) {
        const limitValue = parseInt(limit) || 5;
        const [rows] = await pool.query(
            'SELECT p.id, p.name, p.image_url, ' +
            'CAST(SUM(oi.quantity) AS SIGNED) as total_quantity, ' +
            'CAST(SUM(oi.quantity * oi.price) AS DECIMAL(10,2)) as total_revenue ' +
            'FROM order_items oi ' +
            'JOIN products p ON oi.product_id = p.id ' +
            'JOIN orders o ON oi.order_id = o.id ' +
            'WHERE o.created_at BETWEEN ? AND ? ' +
            'GROUP BY p.id, p.name, p.image_url ' +
            'ORDER BY total_quantity DESC ' +
            `LIMIT ${limitValue}`,
            [startDate, endDate]
        );
        return rows;
    }

    static async getFilteredProducts(filters) {
        let query = `
            SELECT p.id, p.name, p.image_url, 
            CAST(SUM(oi.quantity) AS SIGNED) as total_quantity,
            CAST(SUM(oi.quantity * oi.price) AS DECIMAL(10,2)) as total_revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.startDate) {
            query += ' AND o.created_at >= ?';
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            query += ' AND o.created_at <= ?';
            params.push(filters.endDate);
        }
        if (filters.category) {
            query += ' AND p.category_id = ?';
            params.push(parseInt(filters.category));
        }
        if (filters.status) {
            query += ' AND o.status = ?';
            params.push(filters.status);
        }

        query += ' GROUP BY p.id, p.name, p.image_url ORDER BY total_quantity DESC LIMIT 5';

        const [products] = await pool.query(query, params);
        return products;
    }
}

module.exports = OrderItem; 