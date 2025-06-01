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
 * - FAQ support on product detail page
 * - FAQ management (create, update, delete) for admins
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Cart = require('../models/Cart');
const FAQ = require('../models/FAQ');  // Import FAQ model

// Helper function to format price
const formatPrice = (price) => {
    return parseFloat(price).toFixed(2);
};

// Get all products
exports.index = async (req, res) => {
    try {
        const { category, sort, search, gender } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = gender ? 100 : 12; // Show more products when filtering by gender
        const offset = (page - 1) * limit;

        // Get products with filters
        const products = await Product.findAll({
            category,
            sort,
            search,
            gender,
            limit,
            offset
        });

        // Get total count for pagination
        const allProducts = await Product.findAll({ category, search, gender });
        const total = allProducts.length;
        const totalPages = Math.ceil(total / limit);

        // Get categories for sidebar
        const categories = await Category.findAll();

        res.render('shop/products', {
            title: 'Products',
            products,
            categories,
            currentCategory: category,
            currentGender: gender,
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

// Get single product with FAQs
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

        // Get FAQs related to product
        const faqs = await FAQ.findByProductId(product.id);

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
            faqs,  // Pass FAQs to template
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
        const userId = req.user ? req.user.id : null;
        const productId = req.params.id;
        const { quantity } = req.body;

        // Validate quantity
        if (!quantity || isNaN(quantity) || quantity < 1) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid quantity' 
            });
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check stock
        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${product.stock} items available in stock` 
            });
        }

        // Add to cart
        const cartItem = await Cart.addItem(userId, productId, quantity, req.session.cart || []);
        
        // Update session cart if user is not logged in
        if (!userId) {
            req.session.cart = cartItem;
        }

        // Get updated cart count
        const cartCount = await Cart.getCartCount(userId, req.session.cart || []);

        res.json({
            success: true,
            message: 'Item added to cart',
            cartCount
        });
    } catch (error) {
        console.error('Error in addToCart:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding item to cart' 
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

/* --------- FAQ management methods (Admin only) --------- */

// Create FAQ for a product
exports.createFAQ = async (req, res) => {
    try {
        const { productId } = req.params;
        const { question, answer } = req.body;

        if (!question || !answer) {
            return res.status(400).json({ message: 'Question and answer are required' });
        }

        const faq = await FAQ.create({ product_id: productId, question, answer });

        res.status(201).json({
            message: 'FAQ created successfully',
            faq
        });
    } catch (error) {
        console.error('Error creating FAQ:', error);
        res.status(500).json({ message: 'Error creating FAQ' });
    }
};

// Update FAQ by ID
exports.updateFAQ = async (req, res) => {
    try {
        const { id } = req.params;
        const { question, answer } = req.body;

        if (!question || !answer) {
            return res.status(400).json({ message: 'Question and answer are required' });
        }

        const success = await FAQ.update(id, { question, answer });
        if (!success) {
            return res.status(404).json({ message: 'FAQ not found' });
        }

        res.json({ message: 'FAQ updated successfully' });
    } catch (error) {
        console.error('Error updating FAQ:', error);
        res.status(500).json({ message: 'Error updating FAQ' });
    }
};

// Delete FAQ by ID
exports.deleteFAQ = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await FAQ.delete(id);

        if (!success) {
            return res.status(404).json({ message: 'FAQ not found' });
        }

        res.json({ message: 'FAQ deleted successfully' });
    } catch (error) {
        console.error('Error deleting FAQ:', error);
        res.status(500).json({ message: 'Error deleting FAQ' });
    }
};
