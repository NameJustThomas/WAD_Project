/**
 * Cart Model
 * Purpose: Handle shopping cart data and operations
 * Features:
 * - Cart item management
 * - Quantity updates
 * - Price calculations
 * - Stock validation
 * - Cart persistence
 * - Cart merging
 */

const pool = require('../config/database');

class Cart {
    static async getCartItems(userId, sessionCart = []) {
        if (!userId) {
            // Return session cart items
            return sessionCart;
        }

        // Get cart items from database
        const [items] = await pool.query(`
            SELECT c.*, p.name, p.image_url as image, p.price, p.discount_price,
                   CASE 
                       WHEN p.discount_price IS NOT NULL THEN p.discount_price
                       ELSE p.price
                   END as final_price
            FROM cart c
            LEFT JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `, [userId]);

        return items.map(item => ({
            ...item,
            price: parseFloat(item.price),
            discount_price: item.discount_price ? parseFloat(item.discount_price) : null,
            final_price: parseFloat(item.final_price)
        }));
    }

    static async addItem(userId, productId, quantity, sessionCart = []) {
        if (!userId) {
            // Add to session cart
            const existingItem = sessionCart.find(item => item.product_id === productId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                // Get product details
                const [products] = await pool.query(
                    'SELECT id, name, price, discount_price, image_url FROM products WHERE id = ?',
                    [productId]
                );
                if (products.length > 0) {
                    const product = products[0];
                    sessionCart.push({
                        product_id: product.id,
                        name: product.name,
                        price: parseFloat(product.price),
                        discount_price: product.discount_price ? parseFloat(product.discount_price) : null,
                        image: product.image_url,
                        quantity: quantity
                    });
                }
            }
            return sessionCart;
        }

        // Add to database cart
        const [existingItems] = await pool.query(
            'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );

        if (existingItems.length > 0) {
            await pool.query(
                'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
                [quantity, userId, productId]
            );
        } else {
            await pool.query(
                'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                [userId, productId, quantity]
            );
        }

        return this.getCartItems(userId);
    }

    static async updateQuantity(userId, productId, quantity, sessionCart = []) {
        if (!userId) {
            // Update session cart
            const item = sessionCart.find(item => item.product_id === productId);
            if (item) {
                if (quantity <= 0) {
                    const index = sessionCart.indexOf(item);
                    sessionCart.splice(index, 1);
                } else {
                    item.quantity = quantity;
                }
            }
            return sessionCart;
        }

        // Update database cart
        if (quantity <= 0) {
            await this.removeItem(userId, productId);
            return this.getCartItems(userId);
        }

        await pool.query(
            'UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?',
            [quantity, userId, productId]
        );

        return this.getCartItems(userId);
    }

    static async removeItem(userId, productId, sessionCart = []) {
        if (!userId) {
            // Remove from session cart
            const index = sessionCart.findIndex(item => item.product_id === productId);
            if (index > -1) {
                sessionCart.splice(index, 1);
            }
            return sessionCart;
        }

        // Remove from database cart
        await pool.query(
            'DELETE FROM cart WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );

        return this.getCartItems(userId);
    }

    static async clearCart(userId, sessionCart = []) {
        if (!userId) {
            return [];
        }

        await pool.query('DELETE FROM cart WHERE user_id = ?', [userId]);
        return [];
    }

    static async getCartTotal(userId, sessionCart = []) {
        if (!userId) {
            // Calculate session cart total
            return sessionCart.reduce((total, item) => {
                const price = item.discount_price || item.price;
                return total + (price * item.quantity);
            }, 0);
        }

        // Calculate database cart total
        const [result] = await pool.query(`
            SELECT SUM(
                CASE 
                    WHEN p.discount_price IS NOT NULL THEN p.discount_price * c.quantity
                    ELSE p.price * c.quantity
                END
            ) as total
            FROM cart c
            LEFT JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        `, [userId]);

        return result[0].total || 0;
    }

    static async getCartCount(userId, sessionCart = []) {
        if (!userId) {
            // Calculate session cart count
            return sessionCart.reduce((total, item) => total + item.quantity, 0);
        }

        // Calculate database cart count
        const [result] = await pool.query(
            'SELECT SUM(quantity) as count FROM cart WHERE user_id = ?',
            [userId]
        );

        return result[0].count || 0;
    }

    static async mergeSessionCart(userId, sessionCart) {
        if (!userId || !sessionCart.length) return;

        // Add session cart items to database
        for (const item of sessionCart) {
            await this.addItem(userId, item.product_id, item.quantity);
        }
    }
}

module.exports = Cart; 