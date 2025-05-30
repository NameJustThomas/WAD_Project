/**
 * Product Controller
 * Purpose: Handle product-related operations
 * Features:
 * - List products
 * - Get product details
 * - Search products
 * - Filter products by category
 * - Sort products
 * - Pagination
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Cart = require('../models/Cart');

// Helper function to format price
const formatPrice = (price) => {
    return parseFloat(price).toFixed(2);
};

// Get all products
exports.index = async (req, res) => {
    try {
        const { category, sort, search } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const offset = (page - 1) * limit;

        // Get products with filters
        const products = await Product.findAll({
            category,
            sort,
            search,
            limit,
            offset
        });

        // Get total count for pagination
        const allProducts = await Product.findAll({ category, search });
        const total = allProducts.length;
        const totalPages = Math.ceil(total / limit);

        // Get categories for sidebar
        const categories = await Category.findAll();

        res.render('shop/products', {
            title: 'Products',
            products,
            categories,
            currentCategory: category,
            currentSort: sort || 'newest',
            sort,
            search,
            searchQuery: search || '',
            currentPage: page,
            totalPages,
            cartCount: req.session.cart ? req.session.cart.length : 0
        });
    } catch (error) {
        console.error('Error in products index:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading products',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// Get single product
exports.show = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).render('error', {
                title: 'Not Found',
                message: 'Product not found',
                error: {}
            });
        }

        // Get related products from same category
        const relatedProducts = await Product.findAll({
            category: product.category_id,
            limit: 4,
            exclude: product.id
        });

        // Get cart count from database if user is logged in
        let cartCount = 0;
        if (req.user) {
            const cartItems = await Cart.getCartItems(req.user.id);
            cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
        }

        res.render('shop/show', {
            title: product.name,
            product: {
                ...product,
                stock: parseInt(product.stock) || 0
            },
            relatedProducts,
            cartCount
        });
    } catch (error) {
        console.error('Error in product show:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading product',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// Get products by category
exports.getByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const products = await Product.findByCategory(categoryId);

        res.render('shop/products', {
            title: 'Category Products',
            products,
            currentCategory: categoryId,
            currentSort: 'newest',
            searchQuery: '',
            cartCount: req.session.cart ? req.session.cart.length : 0
        });
    } catch (error) {
        console.error('Error in getByCategory:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading category products',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// Search products
exports.search = async (req, res) => {
    try {
        const { q } = req.query;
        const products = await Product.search(q);

        res.render('shop/products', {
            title: 'Search Results',
            products,
            search: q,
            searchQuery: q || '',
            currentSort: 'newest',
            cartCount: req.session.cart ? req.session.cart.length : 0
        });
    } catch (error) {
        console.error('Error in product search:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error searching products',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// Add to cart
exports.addToCart = async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Please login to add items to cart',
                redirect: '/auth/login'
            });
        }

        const productId = req.params.id;
        const quantity = parseInt(req.body.quantity) || 1;
        const userId = req.user.id;

        // Get product from database
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if product is in stock
        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Not enough stock available'
            });
        }

        // Add to cart using Cart model
        const cartItem = await Cart.addToCart(userId, productId, quantity);
        
        // Get updated cart count
        const cartItems = await Cart.getCartItems(userId);
        const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

        res.json({
            success: true,
            message: 'Product added to cart',
            cartCount
        });
    } catch (error) {
        console.error('Error in addToCart:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding product to cart'
        });
    }
};

// Create new product (Admin only)
exports.create = async (req, res) => {
    try {
        const errors = await Product.validate(req.body);
        if (errors) {
            return res.status(400).json({ errors });
        }

        const product = await Product.create(req.body);
        res.status(201).json({
            message: 'Product created successfully',
            product
        });
    } catch (error) {
        console.error('Error in product create:', error);
        res.status(500).json({ message: 'Error creating product' });
    }
};

// Update product (Admin only)
exports.update = async (req, res) => {
    try {
        const errors = await Product.validate(req.body);
        if (errors) {
            return res.status(400).json({ errors });
        }

        const success = await Product.update(req.params.id, req.body);
        if (!success) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error in product update:', error);
        res.status(500).json({ message: 'Error updating product' });
    }
};

// Delete product (Admin only)
exports.delete = async (req, res) => {
    try {
        const success = await Product.delete(req.params.id);
        if (!success) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error in product delete:', error);
        res.status(500).json({ message: 'Error deleting product' });
    }
};

// Get featured products (API endpoint)
exports.getFeaturedProducts = async (req, res, next) => {
    try {
        const products = await Product.findFeatured();
        res.json(products);
    } catch (error) {
        next(error);
    }
};

// Get top selling products (API endpoint)
exports.getTopSellingProducts = async (req, res, next) => {
    try {
        const products = await Product.getTopSelling();
        res.json(products);
    } catch (error) {
        next(error);
    }
}; 