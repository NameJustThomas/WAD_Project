/**
 * Review Controller
 * Purpose: Handle product review operations
 * Features:
 * - Add product reviews
 * - Edit reviews
 * - Delete reviews
 * - List product reviews
 * - Review ratings
 * - Review moderation
 */

const db = require('../config/database');

// Get all reviews
exports.getAllReviews = async (req, res) => {
    try {
        const [reviews] = await db.query(`
            SELECT r.*, u.name as user_name, p.name as product_name 
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN products p ON r.product_id = p.id
            ORDER BY r.created_at DESC
        `);
        res.json(reviews);
    } catch (error) {
        console.error('Error getting reviews:', error);
        res.status(500).json({ message: 'Error getting reviews' });
    }
};

// Get reviews by product ID
exports.getReviewsByProduct = async (req, res) => {
    try {
        const productId = req.params.productId;
        const [reviews] = await db.query(`
            SELECT r.*, u.name as user_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ?
            ORDER BY r.created_at DESC
        `, [productId]);
        res.json(reviews);
    } catch (error) {
        console.error('Error getting product reviews:', error);
        res.status(500).json({ message: 'Error getting product reviews' });
    }
};

// Get reviews by user ID
exports.getReviewsByUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        const [reviews] = await db.query(`
            SELECT r.*, p.name as product_name
            FROM reviews r
            JOIN products p ON r.product_id = p.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        `, [userId]);
        res.json(reviews);
    } catch (error) {
        console.error('Error getting user reviews:', error);
        res.status(500).json({ message: 'Error getting user reviews' });
    }
};

// Create a new review
exports.createReview = async (req, res) => {
    try {
        const { product_id, rating, comment } = req.body;
        const user_id = req.user.id; // Assuming user is authenticated

        // Validate input
        if (!product_id || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Invalid review data' });
        }

        // Check if user has already reviewed this product
        const [existingReview] = await db.query(
            'SELECT * FROM reviews WHERE user_id = ? AND product_id = ?',
            [user_id, product_id]
        );

        if (existingReview.length > 0) {
            return res.status(400).json({ message: 'You have already reviewed this product' });
        }

        // Create review
        const [result] = await db.query(
            'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)',
            [user_id, product_id, rating, comment]
        );

        // Get the created review with user and product info
        const [newReview] = await db.query(`
            SELECT r.*, u.name as user_name, p.name as product_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN products p ON r.product_id = p.id
            WHERE r.id = ?
        `, [result.insertId]);

        res.status(201).json(newReview[0]);
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ message: 'Error creating review' });
    }
};

// Update a review
exports.updateReview = async (req, res) => {
    try {
        const reviewId = req.params.id;
        const { rating, comment } = req.body;
        const user_id = req.user.id; // Assuming user is authenticated

        // Validate input
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Invalid review data' });
        }

        // Check if review exists and belongs to user
        const [review] = await db.query(
            'SELECT * FROM reviews WHERE id = ? AND user_id = ?',
            [reviewId, user_id]
        );

        if (review.length === 0) {
            return res.status(404).json({ message: 'Review not found or unauthorized' });
        }

        // Update review
        await db.query(
            'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
            [rating, comment, reviewId]
        );

        // Get the updated review
        const [updatedReview] = await db.query(`
            SELECT r.*, u.name as user_name, p.name as product_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN products p ON r.product_id = p.id
            WHERE r.id = ?
        `, [reviewId]);

        res.json(updatedReview[0]);
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ message: 'Error updating review' });
    }
};

// Delete a review
exports.deleteReview = async (req, res) => {
    try {
        const reviewId = req.params.id;
        const user_id = req.user.id; // Assuming user is authenticated

        // Check if review exists and belongs to user
        const [review] = await db.query(
            'SELECT * FROM reviews WHERE id = ? AND user_id = ?',
            [reviewId, user_id]
        );

        if (review.length === 0) {
            return res.status(404).json({ message: 'Review not found or unauthorized' });
        }

        // Delete review
        await db.query('DELETE FROM reviews WHERE id = ?', [reviewId]);
        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ message: 'Error deleting review' });
    }
};

// Get average rating for a product
exports.getProductAverageRating = async (req, res) => {
    try {
        const productId = req.params.productId;
        const [result] = await db.query(`
            SELECT 
                AVG(rating) as average_rating,
                COUNT(*) as total_reviews
            FROM reviews
            WHERE product_id = ?
        `, [productId]);

        res.json({
            average_rating: parseFloat(result[0].average_rating) || 0,
            total_reviews: result[0].total_reviews
        });
    } catch (error) {
        console.error('Error getting product average rating:', error);
        res.status(500).json({ message: 'Error getting product average rating' });
    }
}; 