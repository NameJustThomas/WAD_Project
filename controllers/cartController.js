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
        // Map the items to ensure consistent field names
        const mappedCartItems = cartItems.map(item => ({
            ...item,
            product_id: item.product_id || item.id // Ensure product_id is always present
        }));
        
        const subtotal = await Cart.getCartTotal(userId, sessionCart);
        const shipping = 10; // Fixed shipping cost
        let total = subtotal + shipping;
        let discount = 0;

        console.log('Session coupon:', req.session.coupon);

        // Apply coupon discount if exists
        if (req.session.coupon) {
            console.log('Applying coupon:', req.session.coupon);
            if (req.session.coupon.discount_type === 'percent') {
                discount = (subtotal * req.session.coupon.discount_value / 100);
                console.log('Percent discount calculated:', discount);
            } else {
                discount = req.session.coupon.discount_value;
                console.log('Fixed discount:', discount);
            }
            // Ensure discount doesn't exceed subtotal
            discount = Math.min(discount, subtotal);
            console.log('Final discount after limit:', discount);
            total = subtotal + shipping - discount;
            console.log('Final total after discount:', total);
        }

        const couponData = req.session.coupon ? {
            code: req.session.coupon.code,
            discount: discount,
            discount_type: req.session.coupon.discount_type,
            discount_value: req.session.coupon.discount_value
        } : null;

        console.log('Coupon data being sent to template:', couponData);
        console.log('Cart totals:', {
            subtotal: subtotal.toFixed(2),
            shipping: shipping.toFixed(2),
            discount: discount.toFixed(2),
            total: total.toFixed(2)
        });

        res.render('shop/cart', {
            title: 'Shopping Cart',
            cartItems: mappedCartItems,
            subtotal: subtotal.toFixed(2),
            shipping: shipping.toFixed(2),
            total: total.toFixed(2),
            coupon: couponData
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
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { quantity } = req.body;
        const userId = req.user ? req.user.id : null;
        const sessionCart = req.session.cart || [];

        // Constants
        const MAX_CART_ITEMS = 99; // Maximum items per product in cart
        const MAX_TOTAL_ITEMS = 999; // Maximum total items in cart

        // Check if product exists and get current stock
        const [products] = await connection.query(
            `SELECT p.*, 
                    COALESCE(c.quantity, 0) as cart_quantity,
                    (SELECT COUNT(*) FROM cart WHERE user_id = ?) as total_cart_items
             FROM products p 
             LEFT JOIN cart c ON p.id = c.product_id AND c.user_id = ? 
             WHERE p.id = ?`,
            [userId, userId, id]
        );

        if (!products.length) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const product = products[0];
        const currentCartQuantity = parseInt(product.cart_quantity) || 0;
        const totalCartItems = parseInt(product.total_cart_items) || 0;
        const requestedQuantity = parseInt(quantity);

        // Validate quantity
        if (isNaN(requestedQuantity) || requestedQuantity < 1) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Invalid quantity' });
        }

        // Check maximum items per product
        if (currentCartQuantity + requestedQuantity > MAX_CART_ITEMS) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: `Maximum ${MAX_CART_ITEMS} items per product allowed in cart` 
            });
        }

        // Check maximum total items
        if (totalCartItems + requestedQuantity > MAX_TOTAL_ITEMS) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: `Maximum ${MAX_TOTAL_ITEMS} total items allowed in cart` 
            });
        }

        // Check if enough stock
        if (product.stock < (currentCartQuantity + requestedQuantity)) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: `Only ${product.stock - currentCartQuantity} items available in stock` 
            });
        }

        // Validate product price
        if (isNaN(product.price) || product.price < 0) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid product price' 
            });
        }
        
        if (!userId) {
            // Add to session cart
            const existingItem = sessionCart.find(item => item.product_id === id);
            if (existingItem) {
                existingItem.quantity += requestedQuantity;
            } else {
                // Validate product data before adding to session
                const productData = {
                    product_id: product.id,
                    name: product.name,
                    price: parseFloat(product.price),
                    discount_price: product.discount_price ? parseFloat(product.discount_price) : null,
                    image: product.image_url,
                    quantity: requestedQuantity
                };

                // Validate product data
                if (!productData.name || !productData.image || isNaN(productData.price)) {
                    await connection.rollback();
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Invalid product data' 
                    });
                }

                sessionCart.push(productData);
            }
            req.session.cart = sessionCart;
        } else {
            // Add to database cart
            const [existingItems] = await connection.query(
                'SELECT * FROM cart WHERE user_id = ? AND product_id = ? FOR UPDATE',
                [userId, id]
            );

            if (existingItems.length > 0) {
                await connection.query(
                    'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
                    [requestedQuantity, userId, id]
                );
            } else {
                await connection.query(
                    'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                    [userId, id, requestedQuantity]
                );
        }
        }

        await connection.commit();

        // Get updated cart count
        const cartCount = await Cart.getCartCount(userId, sessionCart);

        res.json({
            success: true,
            message: 'Item added to cart',
            cartCount
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error in addItem:', error);
        res.status(500).json({ success: false, message: 'Error adding item to cart' });
    } finally {
        connection.release();
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

        console.log('Removing item - Product ID:', productId);
        console.log('User ID:', userId);
        console.log('Session cart before:', sessionCart);

        if (!productId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Product ID is required' 
            });
        }

        // Remove item from cart
        const cartData = await Cart.removeItem(userId, productId, sessionCart);
        console.log('Cart data after removal:', cartData);

        // Update session cart if user is not logged in
        if (!userId) {
            // Replace the entire session cart with the new one
            req.session.cart = cartData.items;
            console.log('Updated session cart:', req.session.cart);
        }

        // Calculate shipping and total
        const shipping = 10; // Fixed shipping cost
        const total = Number(cartData.total) + shipping;

        // Prepare response data
        const responseData = {
            success: true,
            message: 'Item removed from cart',
            cart: {
                items: cartData.items,
                subtotal: Number(cartData.total).toFixed(2),
                shipping: shipping.toFixed(2),
                total: total.toFixed(2),
                totalItems: cartData.totalItems
            }
        };

        console.log('Sending response:', responseData);
        res.json(responseData);
    } catch (error) {
        console.error('Error in removeItem:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error removing item from cart' 
        });
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
        console.log('Checkout request received');
        console.log('Session user:', req.session.user);
        console.log('Session cart:', req.session.cart);

        const userId = req.session.user ? req.session.user.id : null;
        const sessionCart = req.session.cart || [];

        if (!userId) {
            console.log('User not logged in, redirecting to login');
            req.session.checkoutIntent = true;
            return res.json({
                success: true,
                redirect: '/login'
            });
        }

        if (sessionCart.length > 0) {
            console.log('Merging session cart with user cart');
            await Cart.mergeSessionCart(userId, sessionCart);
            req.session.cart = [];
        }

        console.log('Redirecting to checkout page');
        res.json({
            success: true,
            redirect: '/checkout'
        });
    } catch (error) {
        console.error('Error in checkout:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error processing checkout. Please try again.' 
        });
    }
};

// Apply coupon to cart
exports.applyCoupon = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { couponCode } = req.body;
        const userId = req.user ? req.user.id : null;
        const sessionCart = req.session.cart || [];

        // Validate coupon code
        if (!couponCode) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Coupon code is required' 
            });
        }

        // Check if coupon exists and is valid
        const [coupons] = await connection.query(
            `SELECT * FROM coupons 
             WHERE code = ? 
             AND (expires_at IS NULL OR expires_at > NOW())
             AND (usage_limit IS NULL OR times_used < usage_limit)`,
            [couponCode]
        );

        if (!coupons.length) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid or expired coupon code' 
            });
        }

        const coupon = coupons[0];

        // Get cart items and calculate totals
        const cartItems = await Cart.getCartItems(userId, sessionCart);
        const subtotal = await Cart.getCartTotal(userId, sessionCart);
        const shipping = 10; // Fixed shipping cost

        // Calculate discount
        let discount = 0;
        if (coupon.discount_type === 'percent') {
            discount = (subtotal * coupon.discount_value / 100);
        } else {
            discount = coupon.discount_value;
        }

        // Ensure discount doesn't exceed subtotal
        discount = Math.min(discount, subtotal);

        // Calculate final total
        const total = subtotal + shipping - discount;

        // Update coupon usage count
        await connection.query(
            'UPDATE coupons SET times_used = times_used + 1 WHERE id = ?',
            [coupon.id]
        );

        // Store coupon in session
        req.session.coupon = {
            code: coupon.code,
            discount: discount,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value
        };

        await connection.commit();

        // Format numbers to ensure they are strings with 2 decimal places
        const formattedCart = {
            subtotal: subtotal.toFixed(2),
            shipping: shipping.toFixed(2),
            discount: discount.toFixed(2),
            total: total.toFixed(2),
            totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0)
        };

        console.log('Sending formatted cart data:', formattedCart);

        res.json({
            success: true,
            message: 'Coupon applied successfully',
            cart: formattedCart
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error applying coupon:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error applying coupon' 
        });
    } finally {
        connection.release();
    }
};

module.exports = exports; 