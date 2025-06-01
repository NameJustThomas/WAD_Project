/**
 * Product Model
 * Purpose: Handle product data and operations
 * Features:
 * - CRUD operations for products
 * - Product search and filtering
 * - Category relationships
 * - Price calculations
 * - Stock management
 * - Image handling
 */

const pool = require('../config/database');
const { formatPrice } = require('../helpers/format');

class Product {
    static async findAll(options = {}) {
        try {
            const { category_id, search, sort = 'name_asc', page = 1, limit = 12, gender } = options;
            const offset = (page - 1) * limit;
            const params = [];

            let query = `
                SELECT p.*, c.name as category_name
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE 1=1
            `;

            if (category_id) {
                query += ' AND p.category_id = ?';
                params.push(category_id);
            }

            if (gender) {
                query += ' AND p.gender = ?';
                params.push(gender);
            }

            if (search) {
                query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }

            query += ' GROUP BY p.id';

            // Add sorting
            switch (sort) {
                case 'price_asc':
                    query += ' ORDER BY p.price ASC';
                    break;
                case 'price_desc':
                    query += ' ORDER BY p.price DESC';
                    break;
                case 'name_desc':
                    query += ' ORDER BY p.name DESC';
                    break;
                default:
                    query += ' ORDER BY p.name ASC';
            }

            // Add pagination
            query += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [products] = await pool.query(query, params);
            return products;
        } catch (error) {
            console.error('Error in Product.findAll:', error);
            throw error;
        }
    }

    static async count(options = {}) {
        try {
            const { category_id, search } = options;
            const params = [];

            let query = 'SELECT COUNT(*) as total FROM products WHERE 1=1';

            if (category_id) {
                query += ' AND category_id = ?';
                params.push(category_id);
            }

            if (search) {
                query += ' AND (name LIKE ? OR description LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }

            const [result] = await pool.query(query, params);
            return result[0].total;
        } catch (error) {
            console.error('Error in Product.count:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            // Validate id
            if (!id || isNaN(id)) {
                throw new Error('Invalid product ID');
            }

            const [products] = await pool.query(`
                SELECT p.*, c.name as category_name,
                       CASE 
                           WHEN p.discount_price IS NOT NULL THEN p.discount_price
                           ELSE p.price
                       END as final_price
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.id = ?
            `, [id]);

            if (!products || products.length === 0) {
                return null;
            }

            const product = products[0];
            return {
                ...product,
                price: parseFloat(product.price),
                discount_price: product.discount_price ? parseFloat(product.discount_price) : null,
                final_price: parseFloat(product.final_price),
                stock: parseInt(product.stock)
            };
        } catch (error) {
            console.error('Error in Product.findById:', error);
            throw error;
        }
    }

    static async create(productData) {
        try {
            const { name, description, price, discount_price, image_url, category_id, stock, gender } = productData;
            
            // Xử lý đường dẫn ảnh
            let finalImageUrl = null;
            if (image_url) {
                if (image_url.startsWith('/images/products/')) {
                    finalImageUrl = image_url;
                } else if (image_url.startsWith('data:')) {
                    // Handle base64 image
                    finalImageUrl = image_url;
                } else {
                finalImageUrl = `/images/products/${image_url}`;
                }
            }

            const [result] = await pool.query(
                'INSERT INTO products (name, description, price, discount_price, image_url, category_id, stock, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [name, description, price, discount_price, finalImageUrl, category_id, stock, gender || 'kids']
            );
            return this.findById(result.insertId);
        } catch (error) {
            console.error('Error in Product.create:', error);
            throw error;
        }
    }

    static async update(id, data) {
        try {
            // Xử lý discount_price khi là chuỗi rỗng
            if (data.discount_price === '') {
                data.discount_price = null;
            }

            // Xử lý đường dẫn ảnh
            let finalImageUrl = data.image_url;
            if (data.image_url) {
                if (data.image_url.startsWith('/images/products/')) {
                    finalImageUrl = data.image_url;
                } else if (data.image_url.startsWith('data:')) {
                    // Handle base64 image
                    finalImageUrl = data.image_url;
                } else {
                    finalImageUrl = `/images/products/${data.image_url}`;
                }
            }

            const [result] = await pool.query(
                'UPDATE products SET name = ?, description = ?, price = ?, discount_price = ?, image_url = ?, category_id = ?, stock = ?, gender = ? WHERE id = ?',
                [
                    data.name,
                    data.description,
                    data.price,
                    data.discount_price,
                    finalImageUrl,
                    data.category_id,
                    data.stock,
                    data.gender || 'kids',
                    id
                ]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in Product.update:', error);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in Product.delete:', error);
            throw error;
        }
    }

    static async findFeatured() {
        try {
            const [products] = await pool.query(
                'SELECT * FROM products WHERE is_featured = 1 LIMIT 4'
            );
            return products;
        } catch (error) {
            console.error('Error in Product.findFeatured:', error);
            throw error;
        }
    }

    static async getTopSelling() {
        try {
            const [products] = await pool.query(
                'SELECT p.*, COUNT(oi.id) as order_count FROM products p LEFT JOIN order_items oi ON p.id = oi.product_id GROUP BY p.id ORDER BY order_count DESC LIMIT 4'
            );
            return products;
        } catch (error) {
            console.error('Error in Product.getTopSelling:', error);
            throw error;
        }
    }

    static async validate(productData) {
        const errors = {};

        if (!productData.name) {
            errors.name = 'Name is required';
        }

        if (!productData.description) {
            errors.description = 'Description is required';
        }

        if (!productData.price || isNaN(productData.price) || productData.price <= 0) {
            errors.price = 'Valid price is required';
        }

        if (productData.discount_price && (isNaN(productData.discount_price) || productData.discount_price <= 0)) {
            errors.discount_price = 'Valid discount price is required';
        }

        if (!productData.category_id) {
            errors.category_id = 'Category is required';
        }

        if (!productData.stock || isNaN(productData.stock) || productData.stock < 0) {
            errors.stock = 'Valid stock quantity is required';
        }

        if (!productData.gender || !['men', 'women', 'kids', 'unisex'].includes(productData.gender)) {
            errors.gender = 'Valid gender is required (men, women, kids, or unisex)';
        }

        return Object.keys(errors).length > 0 ? errors : null;
    }

    static formatProduct(product) {
        return {
            ...product,
            price: parseFloat(product.price),
            discount_price: product.discount_price ? parseFloat(product.discount_price) : null,
            final_price: parseFloat(product.final_price),
            formatted_price: formatPrice(product.price),
            formatted_discount_price: product.discount_price ? formatPrice(product.discount_price) : null,
            formatted_final_price: formatPrice(product.final_price),
            has_discount: product.discount_price !== null && product.discount_price < product.price,
            image_url: product.image_url || '/images/products/no-image.jpg'
        };
    }

    static formatProducts(products) {
        return products.map(product => this.formatProduct(product));
    }

    static async findByCategory(categoryName, options = {}) {
        try {
            let query = `
                SELECT p.*, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE c.name = ?
            `;
            const params = [categoryName];

            if (options.search) {
                query += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
                params.push(`%${options.search}%`, `%${options.search}%`);
            }

            if (options.sort) {
                switch(options.sort) {
                    case 'price-low':
                        query += ` ORDER BY p.price ASC`;
                        break;
                    case 'price-high':
                        query += ` ORDER BY p.price DESC`;
                        break;
                    case 'newest':
                        query += ` ORDER BY p.created_at DESC`;
                        break;
                    default:
                        query += ` ORDER BY p.created_at DESC`;
                }
            } else {
                query += ` ORDER BY p.created_at DESC`;
            }

            const [products] = await pool.query(query, params);
            return products;
        } catch (error) {
            throw error;
        }
    }

    static async validateUpdate(data) {
        const errors = {};
        
        if (data.name && data.name.length < 3) {
            errors.name = 'Product name must be at least 3 characters long';
        }
        
        if (data.price && (isNaN(data.price) || data.price <= 0)) {
            errors.price = 'Price must be a positive number';
        }
        
        if (data.discount_price && (isNaN(data.discount_price) || data.discount_price <= 0)) {
            errors.discount_price = 'Discount price must be a positive number';
        }
        
        if (data.stock && (isNaN(data.stock) || data.stock < 0)) {
            errors.stock = 'Stock must be a non-negative number';
        }
        
        if (data.gender && !['men', 'women', 'kids'].includes(data.gender)) {
            errors.gender = 'Gender must be men, women, or kids';
        }
        
        return Object.keys(errors).length === 0 ? null : errors;
    }

    static async getStats() {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as totalProducts,
                COUNT(CASE WHEN stock > 0 THEN 1 END) as inStockProducts,
                COUNT(CASE WHEN stock = 0 THEN 1 END) as outOfStockProducts,
                COUNT(DISTINCT category_id) as totalCategories
            FROM products
        `);
        
        return {
            totalProducts: parseInt(stats[0].totalProducts || 0),
            inStockProducts: parseInt(stats[0].inStockProducts || 0),
            outOfStockProducts: parseInt(stats[0].outOfStockProducts || 0),
            totalCategories: parseInt(stats[0].totalCategories || 0)
        };
    }

    static async addImage(productId, imageFile) {
        try {
            const imagePath = `/images/products/${imageFile.filename}`;
            const [result] = await pool.query(
                'INSERT INTO product_images (product_id, image_path) VALUES (?, ?)',
                [productId, imagePath]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error in Product.addImage:', error);
            throw error;
        }
    }

    static async getImages(productId) {
        try {
            const [images] = await pool.query(
                'SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, created_at ASC',
                [productId]
            );
            return images;
        } catch (error) {
            console.error('Error in Product.getImages:', error);
            throw error;
        }
    }

    static async setPrimaryImage(productId, imageId) {
        try {
            // Reset tất cả ảnh của sản phẩm về không phải primary
            await pool.query(
                'UPDATE product_images SET is_primary = FALSE WHERE product_id = ?',
                [productId]
            );
            
            // Set ảnh được chọn làm primary
            const [result] = await pool.query(
                'UPDATE product_images SET is_primary = TRUE WHERE id = ? AND product_id = ?',
                [imageId, productId]
            );
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in Product.setPrimaryImage:', error);
            throw error;
        }
    }

    static async deleteImage(imageId) {
        try {
            const [result] = await pool.query(
                'DELETE FROM product_images WHERE id = ?',
                [imageId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error in Product.deleteImage:', error);
            throw error;
        }
    }
}

module.exports = Product; 