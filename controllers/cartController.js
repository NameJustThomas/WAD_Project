/**
 * Cart Controller
 * Purpose: Handle shopping cart operations
 * Features:
 * - Add items to cart
 * - Remove items from cart
 * - Update item quantities
 * - Clear cart
 * - View cart contents
 * - Calculate totals
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { isAuthenticated } = require('../middleware/auth');

// Helper function to calculate item total
const calculateItemTotal = (item) => {
    const price = parseFloat(item.price);
    const quantity = parseInt(item.quantity);
    return {
        ...item,
        total: (price * quantity).toFixed(2)
    };
};

// Helper function to calculate cart grand total
const calculateCartGrandTotal = (cart) => {
    return cart.reduce((total, item) => {
        const price = parseFloat(item.price);
        const quantity = parseInt(item.quantity);
        return total + (price * quantity);
    }, 0).toFixed(2);
};

// Get cart page
exports.index = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;
        const sessionCart = req.session.cart || [];
        
        const cartItems = await Cart.getCartItems(userId, sessionCart);
        const subtotal = await Cart.getCartTotal(userId, sessionCart);
        const shipping = 10; // Fixed shipping cost
        const total = subtotal + shipping;

        res.render('shop/cart', {
            title: 'Shopping Cart',
            cartItems,
            subtotal: subtotal.toFixed(2),
            shipping: shipping.toFixed(2),
            total: total.toFixed(2)
        });
    } catch (error) {
        console.error('Error in cart index:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading cart',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// Get cart count (API endpoint)
exports.getCount = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;
        const cartItems = await Cart.getCartItems(userId);
        const count = cartItems.reduce((total, item) => total + item.quantity, 0);
        res.json({ count });
    } catch (error) {
        console.error('Error in getCount:', error);
        res.status(500).json({ message: 'Error getting cart count' });
    }
};

// Add item to cart
exports.addItem = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;
        const userId = req.user ? req.user.id : null;
        const sessionCart = req.session.cart || [];

        // Check if product exists
        const [products] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);
        if (!products.length) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const product = products[0];

        // Check if enough stock
        if (product.stock < quantity) {
            return res.status(400).json({ success: false, message: 'Not enough stock available' });
        }

        // Add to cart
        const updatedCart = await Cart.addItem(userId, productId, quantity, sessionCart);
        
        if (!userId) {
            // Update session cart
            req.session.cart = updatedCart;
        }

        // Get updated cart count
        const cartCount = await Cart.getCartCount(userId, updatedCart);

        res.json({
            success: true,
            message: 'Item added to cart',
            cartCount
        });
    } catch (error) {
        console.error('Error in addItem:', error);
        res.status(500).json({ success: false, message: 'Error adding item to cart' });
    }
};

// Update item quantity
exports.updateQuantity = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;
        const userId = req.user ? req.user.id : null;
        const sessionCart = req.session.cart || [];

        // Update quantity
        const updatedCart = await Cart.updateQuantity(userId, productId, quantity, sessionCart);
        
        if (!userId) {
            // Update session cart
            req.session.cart = updatedCart;
        }

        res.json({
            success: true,
            message: 'Cart updated successfully'
        });
    } catch (error) {
        console.error('Error in updateQuantity:', error);
        res.status(500).json({ success: false, message: 'Error updating cart' });
    }
};

// Remove item from cart
exports.removeItem = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user ? req.user.id : null;
        const sessionCart = req.session.cart || [];

        // Remove item
        const updatedCart = await Cart.removeItem(userId, productId, sessionCart);
        
        if (!userId) {
            // Update session cart
            req.session.cart = updatedCart;
        }

        res.json({
            success: true,
            message: 'Item removed from cart'
        });
    } catch (error) {
        console.error('Error in removeItem:', error);
        res.status(500).json({ success: false, message: 'Error removing item from cart' });
    }
};

// Clear cart
exports.clearCart = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;
        const sessionCart = req.session.cart || [];

        // Clear cart
        await Cart.clearCart(userId, sessionCart);
        
        if (!userId) {
            // Clear session cart
            req.session.cart = [];
        }

        res.json({
            success: true,
            message: 'Cart cleared successfully'
        });
    } catch (error) {
        console.error('Error in clearCart:', error);
        res.status(500).json({ success: false, message: 'Error clearing cart' });
    }
};

exports.checkout = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;
        const sessionCart = req.session.cart || [];

        if (!userId) {
            req.session.checkoutIntent = true;
            return res.json({
                success: true,
                redirect: '/auth/login'
            });
        }

        if (sessionCart.length > 0) {
            await Cart.mergeSessionCart(userId, sessionCart);
            req.session.cart = [];
        }

        res.json({
            success: true,
            redirect: '/checkout'
        });
    } catch (error) {
        console.error('Error in checkout:', error);
        res.status(500).json({ success: false, message: 'Error processing checkout' });
    }
};


module.exports = exports; 