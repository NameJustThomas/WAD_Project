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

const Product = require('../models/Product');
const Category = require('../models/Category');
const pool = require('../config/database');

// Home page
exports.getHome = async (req, res) => {
    try {
        // Get products using Product model
        const products = await Product.findAll({
            sort: 'newest',
            limit: 8
        });

        // Get all categories
        const [categories] = await pool.query('SELECT * FROM categories');

        // Get feedbacks (limit for homepage display)
        const [feedbacks] = await pool.query(`
            SELECT name, rating, content
            FROM feedbacks
            ORDER BY created_at DESC
            LIMIT 6
        `);

        // Render home.ejs
        res.render('home', {
            title: 'Home',
            products,
            categories,
            feedbacks
        });

    } catch (error) {
        console.error('Error fetching home page data:', error);
        res.status(500).render('error', {
            message: 'Error loading home page',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};
