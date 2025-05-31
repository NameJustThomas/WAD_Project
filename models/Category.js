/**
 * Category Model
 * Purpose: Handle product category data and operations
 * Features:
 * - CRUD operations for categories
 * - Product categorization
 * - Category hierarchy
 * - Category search
 * - Product count by category
 */

const pool = require('../config/database');

class Category {
    static async findAll() {
        try {
            const [categories] = await pool.query('SELECT * FROM categories ORDER BY name');
            return categories;
        } catch (error) {
            console.error('Error in Category.findAll:', error);
            throw error;
        }
    }

    static async count() {
        try {
            const [result] = await pool.query('SELECT COUNT(*) as total FROM categories');
            return result[0].total;
        } catch (error) {
            console.error('Error in Category.count:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const [categories] = await pool.query(
                'SELECT * FROM categories WHERE id = ?',
                [id]
            );
            return categories[0] || null;
        } catch (error) {
            console.error('Error in Category.findById:', error);
            throw error;
        }
    }

    static async create(categoryData) {
        try {
            const [result] = await pool.query(
                'INSERT INTO categories (name, description, image) VALUES (?, ?, ?)',
                [categoryData.name, categoryData.description, categoryData.image]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error in Category.create:', error);
            throw error;
        }
    }

    static async update(id, categoryData) {
        try {
            const [result] = await pool.query(
                'UPDATE categories SET name = ?, description = ?, image = ? WHERE id = ?',
                [categoryData.name, categoryData.description, categoryData.image, id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in Category.update:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const [result] = await pool.query(
                'DELETE FROM categories WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in Category.delete:', error);
            throw error;
        }
    }

    static async getSalesByCategory() {
        const [categories] = await pool.query(`
            SELECT c.*,
                   COUNT(DISTINCT o.id) as total_orders,
                   SUM(oi.quantity) as total_quantity,
                   SUM(oi.quantity * oi.price) as total_revenue
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id
            WHERE o.status != 'cancelled'
            GROUP BY c.id
            ORDER BY total_revenue DESC
        `);
        return categories;
    }

    static async validate(categoryData) {
        const errors = {};
        
        if (!categoryData.name) {
            errors.name = 'Category name is required';
        }
        
        if (!categoryData.description) {
            errors.description = 'Category description is required';
        }

        if (!categoryData.image) {
            errors.image = 'Category image is required';
        }

        return Object.keys(errors).length > 0 ? errors : null;
    }

    static async validateUpdate(data) {
        const errors = {};
        
        if (data.name && data.name.length < 2) {
            errors.name = 'Category name must be at least 2 characters long';
        }
        
        if (data.description && data.description.length > 500) {
            errors.description = 'Description must not exceed 500 characters';
        }

        if (data.image && data.image.length > 255) {
            errors.image = 'Image URL must not exceed 255 characters';
        }

        return Object.keys(errors).length === 0 ? null : errors;
    }
}

module.exports = Category;
