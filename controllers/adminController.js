/**
 * Admin Controller
 * Purpose: Handle administrative operations
 * Features:
 * - Dashboard statistics
 * - Product management
 * - User management
 * - Order management
 * - Category management
 * - Analytics and reports
 */

const pool = require('../config/database');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const db = require('../config/database');
const { Op } = require('sequelize');
const sequelize = require('sequelize');
const OrderItem = require('../models/OrderItem');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const upload = require('../middleware/upload');

// Middleware to check if user is admin
exports.isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).render('error', {
            message: 'Access denied. Admin privileges required.'
        });
    }
};

// Admin dashboard
exports.index = async (req, res) => {
    try {
        // Get total orders
        const [totalOrdersResult] = await pool.query('SELECT COUNT(*) as count FROM orders');
        const totalOrders = totalOrdersResult[0].count;

        // Get total revenue
        const [totalRevenueResult] = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders');
        const totalRevenue = totalRevenueResult[0].total;

        // Get pending orders count
        const [pendingOrdersResult] = await pool.query('SELECT COUNT(*) as count FROM orders WHERE status = ?', ['pending']);
        const pendingOrders = pendingOrdersResult[0].count;

        // Get completed orders count
        const [completedOrdersResult] = await pool.query('SELECT COUNT(*) as count FROM orders WHERE status = ?', ['completed']);
        const completedOrders = completedOrdersResult[0].count;

        // Get recent orders with formatted data
        const [recentOrders] = await pool.query(`
            SELECT o.*, CONCAT(p.first_name, ' ', p.last_name) as user_name 
            FROM orders o 
            LEFT JOIN profiles p ON o.user_id = p.user_id 
            ORDER BY o.created_at DESC 
            LIMIT 5
        `);

        // Format recent orders data
        const formattedRecentOrders = recentOrders.map(order => ({
            id: order.id,
            user_name: order.user_name || 'Guest',
            formatted_amount: parseFloat(order.total_amount || 0).toFixed(2),
            status: order.status,
            formatted_date: new Date(order.created_at).toLocaleDateString()
        }));

        // Get monthly sales data
        const [monthlySales] = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                SUM(total_amount) as total
            FROM orders
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month ASC
            LIMIT 6
        `);

        // Format monthly sales data for chart
        const monthlySalesData = {
            type: 'line',
            data: {
                labels: monthlySales.map(item => {
                    const [year, month] = item.month.split('-');
                    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                }),
                datasets: [{
                    label: 'Sales',
                    data: monthlySales.map(item => parseFloat(item.total || 0).toFixed(2)),
                    borderColor: '#17a2b8',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        };

        res.render('admin/dashboard', {
            title: 'Dashboard',
            totalOrders,
            totalRevenue: parseFloat(totalRevenue || 0).toFixed(2),
            pendingOrders,
            completedOrders,
            recentOrders: formattedRecentOrders,
            monthlySalesData
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading dashboard',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// Product management
exports.getProducts = async (req, res) => {
    try {
        const [products, categories] = await Promise.all([
            Product.findAll(),
            Category.findAll()
        ]);
        
        // Format product data
        const formattedProducts = products.map(product => ({
            ...product,
            formatted_price: parseFloat(product.price || 0).toFixed(2),
            formatted_discount_price: product.discount_price ? parseFloat(product.discount_price).toFixed(2) : null,
            category_name: product.category_name || 'Uncategorized',
            gender: product.gender || 'kids'
        }));

        res.render('admin/products', {
            title: 'Manage Products',
            products: formattedProducts,
            categories
        });
    } catch (error) {
        console.error('Error in getProducts:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading products',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const errors = await Product.validate(req.body);
        if (errors) {
            return res.status(400).json({ errors });
        }

        // Ensure gender is one of the valid values
        if (!['men', 'women', 'kids', 'unisex'].includes(req.body.gender)) {
            req.body.gender = 'kids'; // Default to kids if invalid
        }

        // Handle image upload if exists
        if (req.file) {
            const productName = req.body.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const timestamp = Date.now();
            const extension = path.extname(req.file.originalname);
            const newFilename = `${productName}-${timestamp}${extension}`;
            
            // Rename the uploaded file
            const oldPath = req.file.path;
            const newPath = path.join(path.dirname(oldPath), newFilename);
            await fs.rename(oldPath, newPath);
            
            // Update the image_url in the request body
            req.body.image_url = `/images/products/${newFilename}`;
        }

        const product = await Product.create(req.body);
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product
        });
    } catch (error) {
        console.error('Error in createProduct:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating product'
        });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Ensure gender is one of the valid values
        if (updateData.gender && !['men', 'women', 'kids', 'unisex'].includes(updateData.gender)) {
            updateData.gender = 'kids'; // Default to kids if invalid
        }

        // Handle image upload if exists
        if (req.file) {
            // Get current product data
            const currentProduct = await Product.findById(parseInt(id));
            
            // Delete old image if exists and not default
            if (currentProduct && currentProduct.image_url && !currentProduct.image_url.includes('no-image.jpg')) {
                const oldImagePath = path.join(__dirname, '../public', currentProduct.image_url);
                try {
                    await fs.access(oldImagePath);
                    await fs.unlink(oldImagePath);
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        console.error('Error deleting old image:', error);
                    }
                }
            }

            // Create new filename using product name
            const productName = updateData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const timestamp = Date.now();
            const extension = path.extname(req.file.originalname);
            const newFilename = `${productName}-${timestamp}${extension}`;
            
            // Rename the uploaded file
            const oldPath = req.file.path;
            const newPath = path.join(path.dirname(oldPath), newFilename);
            await fs.rename(oldPath, newPath);
            
            // Update the image_url in the update data
            updateData.image_url = `/images/products/${newFilename}`;
        }

        // Validate the update data
        const errors = await Product.validate(updateData);
        if (errors) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        // Update the product
        const success = await Product.update(parseInt(id), updateData);
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Get updated product data
        const updatedProduct = await Product.findById(parseInt(id));

        // Return success response with updated data
        return res.json({
            success: true,
            message: 'Product updated successfully',
            product: {
                ...updatedProduct,
                formatted_price: parseFloat(updatedProduct.price).toFixed(2),
                formatted_discount_price: updatedProduct.discount_price ? parseFloat(updatedProduct.discount_price).toFixed(2) : null,
                image_url: updatedProduct.image_url || '/images/products/no-image.jpg'
            }
        });

    } catch (error) {
        console.error('Error in updateProduct:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating product'
        });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const success = await Product.delete(req.params.id);
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteProduct:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting product'
        });
    }
};

// Category management
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.findAll();
        res.render('admin/categories', {
            title: 'Manage Categories',
            categories
        });
    } catch (error) {
        console.error('Error in getCategories:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading categories',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const errors = await Category.validate(req.body);
        if (errors) {
            return res.status(400).json({ errors });
        }

        const category = await Category.create(req.body);
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category
        });
    } catch (error) {
        console.error('Error in createCategory:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating category'
        });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Validate the update data
        const errors = await Category.validate(updateData);
        if (errors) {
            if (req.xhr || req.headers.accept.includes('application/json')) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }
            return res.status(400).render('admin/categories', {
                title: 'Manage Categories',
                error: 'Validation failed',
                errors
            });
        }

        // Update the category
        const success = await Category.update(parseInt(id), updateData);
        if (!success) {
            if (req.xhr || req.headers.accept.includes('application/json')) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }
            return res.status(404).render('error', {
                title: 'Error',
                message: 'Category not found'
            });
        }

        // Send response based on request type
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.json({
                success: true,
                message: 'Category updated successfully'
            });
        }
        
        req.flash('success', 'Category updated successfully');
        res.redirect('/admin/categories');
    } catch (error) {
        console.error('Error in updateCategory:', error);
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(500).json({
                success: false,
                message: 'Error updating category'
            });
        }
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error updating category',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const success = await Category.delete(req.params.id);
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteCategory:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting category'
        });
    }
};

// Order management
exports.getOrders = async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT o.*, CONCAT(p.first_name, ' ', p.last_name) as user_name 
            FROM orders o 
            LEFT JOIN profiles p ON o.user_id = p.user_id 
            ORDER BY o.created_at DESC
        `);

        // Format orders data
        const formattedOrders = orders.map(order => ({
            ...order,
            user_name: order.user_name || 'Guest',
            formatted_amount: parseFloat(order.total_amount || 0).toFixed(2),
            formatted_date: new Date(order.created_at).toLocaleDateString()
        }));

        res.render('admin/orders', {
            title: 'Manage Orders',
            orders: formattedOrders
        });
    } catch (error) {
        console.error('Error in getOrders:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading orders',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

exports.updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Update the order
        const success = await Order.updateStatus(parseInt(id), updateData.status);
        if (!success) {
            if (req.xhr || req.headers.accept.includes('application/json')) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
            return res.status(404).render('error', {
                title: 'Error',
                message: 'Order not found'
            });
        }

        // Send response based on request type
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.json({
                success: true,
                message: 'Order updated successfully'
            });
        }
        
        req.flash('success', 'Order updated successfully');
        res.redirect('/admin/orders');
    } catch (error) {
        console.error('Error in updateOrder:', error);
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(500).json({
                success: false,
                message: 'Error updating order'
            });
        }
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error updating order',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// User management
exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        // Format user data
        const formattedUsers = users.map(user => ({
            ...user,
            role: user.role || 'user',
            status: user.status || 'active'
        }));

        res.render('admin/users', {
            title: 'Manage Users',
            users: formattedUsers
        });
    } catch (error) {
        console.error('Error in getUsers:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading users',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Validate the update data
        const errors = await User.validate(updateData);
        if (errors) {
            if (req.xhr || req.headers.accept.includes('application/json')) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }
            return res.status(400).render('admin/users', {
                title: 'Manage Users',
                error: 'Validation failed',
                errors
            });
        }

        // Update the user
        const success = await User.update(parseInt(id), updateData);
        if (!success) {
            if (req.xhr || req.headers.accept.includes('application/json')) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            return res.status(404).render('error', {
                title: 'Error',
                message: 'User not found'
            });
        }

        // Send response based on request type
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.json({
                success: true,
                message: 'User updated successfully'
            });
        }
        
        req.flash('success', 'User updated successfully');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error in updateUser:', error);
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(500).json({
                success: false,
                message: 'Error updating user'
            });
        }
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error updating user',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const success = await User.delete(req.params.id);
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteUser:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user'
        });
    }
};

// Analytics
exports.analytics = async (req, res) => {
    try {
        // Get last 30 days stats
        const last30DaysStats = await Order.getLast30DaysStats();
        
        // Get monthly sales data
        const monthlySales = await Order.getMonthlySales(6);
        const formattedMonthlySales = Order.formatMonthlySalesData(monthlySales);

        // Get recent orders
        const recentOrders = await Order.getRecentOrders(5);

        // Format data for the view
        const formattedData = {
            last30Days: {
                totalOrders: parseInt(last30DaysStats.totalOrders) || 0,
                pendingOrders: parseInt(last30DaysStats.pendingOrders) || 0,
                completedOrders: parseInt(last30DaysStats.completedOrders) || 0,
                totalRevenue: parseFloat(last30DaysStats.totalRevenue) || 0
            },
            monthlySales: formattedMonthlySales,
            recentOrders: recentOrders.map(order => ({
                id: order.id,
                customer: order.customer_name || 'Guest',
                date: new Date(order.created_at).toLocaleDateString(),
                amount: parseFloat(order.total_amount || 0),
                status: order.status,
                items: order.item_count || 0,
                products: order.product_names || 'No products'
            }))
        };

        res.render('admin/analytics', {
            title: 'Analytics Dashboard',
            data: formattedData
        });
    } catch (error) {
        console.error('Error in analytics:', error);
        res.status(500).render('error', {
            message: 'Error loading analytics data',
            error: error
        });
    }
};

// Get analytics data for date range
exports.getAnalyticsData = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        
        const salesData = await Order.getSalesByDateRange(startDate, endDate);
        const productsData = await OrderItem.getTopSellingProductsByDateRange(startDate, endDate, 5);

        res.json({
            salesData: {
                labels: salesData.map(item => item.month),
                values: salesData.map(item => item.total)
            },
            productsData: {
                labels: productsData.map(item => item.name),
                values: productsData.map(item => item.total_quantity)
            }
        });
    } catch (error) {
        console.error('Error getting analytics data:', error);
        res.status(500).json({ error: 'Failed to get analytics data' });
    }
};

// Apply filters to analytics data
exports.filterAnalytics = async (req, res) => {
    try {
        const filters = req.body;
        const { startDate, endDate, category, status } = filters;

        const salesData = await Order.getFilteredSales(filters);
        const productsData = await OrderItem.getFilteredProducts(filters);

        res.json({
            salesData: {
                labels: salesData.map(item => item.month),
                values: salesData.map(item => item.total)
            },
            productsData: {
                labels: productsData.map(item => item.name),
                values: productsData.map(item => item.total_quantity)
            }
        });
    } catch (error) {
        console.error('Error filtering analytics:', error);
        res.status(500).json({ error: 'Failed to filter analytics data' });
    }
};

// Export analytics data
exports.exportAnalytics = async (req, res) => {
    try {
        const { type, format } = req.body;
        const filters = req.body.filters || {};

        let data;
        if (type === 'sales') {
            data = await Order.getFilteredSales(filters);
        } else if (type === 'products') {
            data = await OrderItem.getFilteredProducts(filters);
        }

        // Format data based on export format
        let exportData;
        if (format === 'csv') {
            exportData = this.convertToCSV(data);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${type}_report.csv`);
        } else if (format === 'json') {
            exportData = JSON.stringify(data, null, 2);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=${type}_report.json`);
        }

        res.send(exportData);
    } catch (error) {
        console.error('Error exporting analytics:', error);
        res.status(500).json({ error: 'Failed to export analytics data' });
    }
};

// Helper method to convert data to CSV
exports.convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(header => row[header]).join(','))
    ];
    
    return csvRows.join('\n');
};

// Get single product
exports.getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const productId = parseInt(id);
        
        // Validate product ID
        if (isNaN(productId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid product ID'
            });
        }

        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Format product data
        const formattedProduct = {
            id: product.id,
            name: product.name,
            category_id: product.category_id,
            price: parseFloat(product.price).toFixed(2),
            discount_price: product.discount_price ? parseFloat(product.discount_price).toFixed(2) : null,
            stock: parseInt(product.stock),
            description: product.description || '',
            status: product.status || 'active',
            image_url: product.image_url || '/images/products/no-image.jpg',
            gender: product.gender || 'kids'
        };

        res.json({
            success: true,
            product: formattedProduct
        });
    } catch (error) {
        console.error('Error in getProduct:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading product',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Upload product image
exports.uploadProductImage = async (req, res) => {
    try {
        upload.single('image')(req, res, async function(err) {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const productId = req.body.product_id;
            if (productId) {
                // Nếu có product_id, thêm ảnh vào database
                const imageId = await Product.addImage(productId, req.file);
                const images = await Product.getImages(productId);
                
                res.json({
                    success: true,
                    message: 'Image uploaded successfully',
                    image: {
                        id: imageId,
                        path: `/images/products/${req.file.filename}`
                    },
                    images: images
                });
            } else {
                // Nếu không có product_id, chỉ trả về đường dẫn ảnh
                res.json({
                    success: true,
                    message: 'Image uploaded successfully',
                    path: `/images/products/${req.file.filename}`
                });
            }
        });
    } catch (error) {
        console.error('Error in uploadProductImage:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading image'
        });
    }
};

// Set primary image
exports.setPrimaryImage = async (req, res) => {
    try {
        const { productId, imageId } = req.body;
        const success = await Product.setPrimaryImage(productId, imageId);
        
        if (success) {
            res.json({
                success: true,
                message: 'Primary image updated successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }
    } catch (error) {
        console.error('Error in setPrimaryImage:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating primary image'
        });
    }
};

// Delete image
exports.deleteImage = async (req, res) => {
    try {
        const { imageId } = req.params;
        const success = await Product.deleteImage(imageId);
        
        if (success) {
            res.json({
                success: true,
                message: 'Image deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }
    } catch (error) {
        console.error('Error in deleteImage:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting image'
        });
    }
};

// Get product images
exports.getProductImages = async (req, res) => {
    try {
        const { productId } = req.params;
        const images = await Product.getImages(productId);
        
        res.json({
            success: true,
            images: images
        });
    } catch (error) {
        console.error('Error in getProductImages:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting product images'
        });
    }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // Update order status
        const [result] = await pool.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, orderId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            message: 'Order status updated successfully'
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating order status'
        });
    }
};

// Get order details
exports.getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const orderId = parseInt(id);

        // Validate order ID
        if (isNaN(orderId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID'
            });
        }

        // Get order details with user and items information
        const [order] = await pool.query(`
            SELECT 
                o.*,
                CONCAT(p.first_name, ' ', p.last_name) as user_name,
                p.email as user_email,
                p.phone as user_phone,
                a.address_line1,
                a.address_line2,
                a.city,
                a.state,
                a.postal_code,
                a.country
            FROM orders o
            LEFT JOIN profiles p ON o.user_id = p.user_id
            LEFT JOIN addresses a ON o.shipping_address_id = a.id
            WHERE o.id = ?
        `, [orderId]);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Get order items
        const [items] = await pool.query(`
            SELECT 
                oi.*,
                p.name as product_name,
                p.image_url as product_image
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [orderId]);

        // Format order data
        const formattedOrder = {
            ...order,
            formatted_amount: parseFloat(order.total_amount || 0).toFixed(2),
            formatted_date: new Date(order.created_at).toLocaleDateString(),
            items: items.map(item => ({
                ...item,
                formatted_price: parseFloat(item.price || 0).toFixed(2),
                formatted_subtotal: parseFloat(item.subtotal || 0).toFixed(2)
            }))
        };

        res.json({
            success: true,
            order: formattedOrder
        });
    } catch (error) {
        console.error('Error in getOrderDetails:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading order details'
        });
    }
};

// Get user details
exports.getUserDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id);

        // Validate user ID
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Get user details with profile information
        const [user] = await pool.query(`
            SELECT 
                u.*,
                p.first_name,
                p.last_name,
                p.phone,
                p.date_of_birth,
                p.gender,
                a.address_line1,
                a.address_line2,
                a.city,
                a.state,
                a.postal_code,
                a.country
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN addresses a ON u.id = a.user_id
            WHERE u.id = ?
        `, [userId]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user's orders
        const [orders] = await pool.query(`
            SELECT 
                id,
                total_amount,
                status,
                created_at
            FROM orders
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, [userId]);

        // Format user data
        const formattedUser = {
            ...user,
            full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A',
            formatted_date: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
            orders: orders.map(order => ({
                ...order,
                formatted_amount: parseFloat(order.total_amount || 0).toFixed(2),
                formatted_date: new Date(order.created_at).toLocaleDateString()
            }))
        };

        res.json({
            success: true,
            user: formattedUser
        });
    } catch (error) {
        console.error('Error in getUserDetails:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading user details'
        });
    }
};

// Get order items
exports.getOrderItems = async (req, res) => {
    try {
        const { id } = req.params;
        const orderId = parseInt(id);

        // Validate order ID
        if (isNaN(orderId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID'
            });
        }

        // Get order items
        const [items] = await pool.query(`
            SELECT 
                oi.*,
                p.name as product_name,
                p.image_url as product_image
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [orderId]);

        // Format items data
        const formattedItems = items.map(item => ({
            ...item,
            formatted_price: parseFloat(item.price || 0).toFixed(2),
            formatted_total: (parseFloat(item.price || 0) * item.quantity).toFixed(2)
        }));

        res.json(formattedItems);
    } catch (error) {
        console.error('Error in getOrderItems:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading order items'
        });
    }
};