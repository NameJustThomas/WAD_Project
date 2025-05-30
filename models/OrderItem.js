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
        const [items] = await pool.query(`
            SELECT oi.*, p.name as product_name, p.image_url as image
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [parseInt(orderId)]);
        return items;
    }

    static async getTopSellingProducts(limit = 5) {
        const [products] = await pool.query(`
            SELECT 
                p.id,
                p.name,
                p.image_url,
                SUM(oi.quantity) as total_quantity,
                COUNT(DISTINCT o.id) as order_count
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'completed'
            GROUP BY p.id, p.name, p.image_url
            ORDER BY total_quantity DESC
            LIMIT ?
        `, [parseInt(limit)]);
        return products;
    }

    static async getProductSalesByMonth(productId, months = 6) {
        const [sales] = await pool.query(`
            SELECT 
                YEAR(o.created_at) as year,
                MONTH(o.created_at) as month,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.quantity * oi.price) as total_revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.product_id = ?
            AND o.status = 'completed'
            AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
            GROUP BY YEAR(o.created_at), MONTH(o.created_at)
            ORDER BY year, month
        `, [parseInt(productId), parseInt(months)]);
        return sales;
    }

    static async getTotalSalesByProduct(productId) {
        const [result] = await pool.query(`
            SELECT 
                SUM(oi.quantity) as total_quantity,
                SUM(oi.quantity * oi.price) as total_revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE oi.product_id = ?
            AND o.status = 'completed'
        `, [parseInt(productId)]);
        return result[0];
    }

    static async getTopProducts(limit = 5) {
        const [products] = await pool.query(`
            SELECT 
                p.id,
                p.name,
                p.image_url,
                COUNT(oi.id) as total_orders,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.quantity * oi.price) as total_revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            GROUP BY p.id, p.name, p.image_url
            ORDER BY total_quantity DESC
            LIMIT ?
        `, [parseInt(limit)]);
        return products;
    }

    static formatProductsData(products) {
        return products.map(product => ({
            id: product.id,
            name: product.name,
            image: product.image_url || '/images/products/no-image.jpg',
            totalOrders: parseInt(product.total_orders) || 0,
            totalQuantity: parseInt(product.total_quantity) || 0,
            totalRevenue: parseFloat(product.total_revenue) || 0
        }));
    }
}

module.exports = OrderItem; 