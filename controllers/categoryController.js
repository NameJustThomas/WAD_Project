/**
 * Category Controller
 * Purpose: Handle product category operations
 * Features:
 * - List all categories
 * - Show category details
 * - Products by category
 * - Category management (admin)
 * - Category search
 */

const pool = require('../config/database');
const Category = require('../models/Category');
const Product = require('../models/Product');

// Get all categories
exports.index = async (req, res, next) => {
    try {
        const categories = await Category.findAll();
        res.render('shop/categories', {
            title: 'Categories',
            categories,
            searchQuery: req.query.search || '',
            currentPage: parseInt(req.query.page) || 1,
            totalPages: Math.ceil(categories.length / 12)
        });
    } catch (error) {
        next(error);
    }
};

// Get category by ID
exports.getCategoryById = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id);
        
        if (!category) {
            return res.status(404).render('error', {
                title: 'Category Not Found',
                message: 'The requested category does not exist',
                error: {}
            });
        }

        const products = await Product.findByCategory(category.name, {
            search: req.query.search,
            sort: req.query.sort
        });

        res.render('shop/category', {
            title: category.name,
            category,
            products,
            searchQuery: req.query.search || '',
            currentSort: req.query.sort || 'newest',
            currentPage: parseInt(req.query.page) || 1,
            totalPages: Math.ceil(products.length / 12)
        });
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).render('error', {
            title: 'Server Error',
            message: 'Error loading category',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// Create new category
exports.create = async (req, res, next) => {
    try {
        const categoryData = {
            name: req.body.name,
            description: req.body.description,
            image: req.body.image // Support image field
        };

        const errors = await Category.validate(categoryData);
        if (errors) {
            return res.render('shop/categories', {
                title: 'Categories',
                errors,
                category: categoryData
            });
        }

        await Category.create(categoryData);
        res.redirect('/categories');
    } catch (error) {
        next(error);
    }
};

// Update category
exports.update = async (req, res, next) => {
    try {
        const categoryData = {
            name: req.body.name,
            description: req.body.description,
            image: req.body.image // Support image field
        };

        const errors = await Category.validateUpdate(categoryData);
        if (errors) {
            const category = await Category.findById(req.params.id);
            return res.render('shop/categories', {
                title: 'Categories',
                errors,
                category: { ...category, ...categoryData }
            });
        }

        const success = await Category.update(req.params.id, categoryData);
        
        if (!success) {
            return res.status(404).render('error', {
                title: 'Category Not Found',
                message: 'The category you are trying to update does not exist',
                error: {}
            });
        }

        res.redirect('/categories');
    } catch (error) {
        next(error);
    }
};

// Delete category
exports.delete = async (req, res, next) => {
    try {
        const success = await Category.delete(req.params.id);
        
        if (!success) {
            return res.status(404).render('error', {
                title: 'Category Not Found',
                message: 'The category you are trying to delete does not exist',
                error: {}
            });
        }

        res.redirect('/categories');
    } catch (error) {
        next(error);
    }
};
