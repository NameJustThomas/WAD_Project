/**
 * Home Controller
 * Purpose: Handle homepage and general site operations
 * Features:
 * - Homepage display
 * - Featured products
 * - Popular categories
 * - Site statistics
 * - Search functionality
 */

const pool = require('../config/database');

// Home page
exports.getHome = async (req, res) => {
    try {
        // Get featured products with category names and discount prices
        const [products] = await pool.query(`
            SELECT p.*, c.name as category_name,
                   CASE 
                       WHEN p.discount_price IS NOT NULL THEN p.discount_price
                       ELSE p.price
                   END as final_price
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.created_at DESC
            LIMIT 8
        `);

        // Get all categories
        const [categories] = await pool.query('SELECT * FROM categories');

        // Convert price and discount_price to number for each product
        const formattedProducts = products.map(product => ({
            ...product,
            price: parseFloat(product.price),
            discount_price: product.discount_price ? parseFloat(product.discount_price) : null,
            final_price: parseFloat(product.final_price)
        }));

        res.render('home', {
            title: 'Home',
            products: formattedProducts,
            categories
        });
    } catch (error) {
        console.error('Error fetching home page data:', error);
        res.status(500).render('error', {
            message: 'Error loading home page',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
}; 