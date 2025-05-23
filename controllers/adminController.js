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
        // Get dashboard statistics
        const [
            totalProducts,
            totalCategories,
            totalOrders,
            totalUsers,
            recentOrders,
            topProducts,
            orderStats,
            monthlySales
        ] = await Promise.all([
            Product.count(),
            Category.count(),
            Order.count(),
            User.count(),
            Order.findRecent(5),
            Product.getTopSelling(5),
            Order.getLast30DaysStats(),
            Order.getMonthlySales(6)
        ]);

        // Format data for display
        const formattedRecentOrders = recentOrders.map(order => ({
            ...order,
            formatted_amount: parseFloat(order.total_amount || 0).toFixed(2),
            formatted_date: new Date(order.created_at).toLocaleDateString()
        }));

        const formattedTopProducts = topProducts.map(product => ({
            ...product,
            formatted_price: parseFloat(product.price || 0).toFixed(2)
        }));

        const formattedMonthlySales = monthlySales.map(sale => ({
            month: new Date(sale.year, sale.month - 1).toLocaleString('default', { month: 'short' }),
            total: parseFloat(sale.total || 0)
        }));

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            totalProducts,
            totalCategories,
            totalOrders,
            totalUsers,
            recentOrders: formattedRecentOrders,
            topProducts: formattedTopProducts,
            totalRevenue: orderStats.totalRevenue.toFixed(2),
            pendingOrders: orderStats.pendingOrders,
            completedOrders: orderStats.completedOrders,
            monthlySales: formattedMonthlySales
        });
    } catch (error) {
        console.error('Error in admin dashboard:', error);
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
            category_name: product.category_name || 'Uncategorized'
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

        // Validate the update data
        const errors = await Product.validate(updateData);
        if (errors) {
            if (req.xhr || req.headers.accept.includes('application/json')) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors
                });
            }
            return res.status(400).render('admin/products', {
                title: 'Manage Products',
                error: 'Validation failed',
                errors
            });
        }

        // Update the product
        const success = await Product.update(parseInt(id), updateData);
        if (!success) {
            if (req.xhr || req.headers.accept.includes('application/json')) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }
            return res.status(404).render('error', {
                title: 'Error',
                message: 'Product not found'
            });
        }

        // Send response based on request type
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.json({
                success: true,
                message: 'Product updated successfully'
            });
        }
        
        req.flash('success', 'Product updated successfully');
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error in updateProduct:', error);
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(500).json({
                success: false,
                message: 'Error updating product'
            });
        }
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error updating product',
            error: process.env.NODE_ENV === 'development' ? error : {}
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
        const orders = await Order.findAll();
        // Format order data
        const formattedOrders = orders.map(order => ({
            ...order,
            formatted_amount: parseFloat(order.total_amount || 0).toFixed(2),
            formatted_date: new Date(order.created_at).toLocaleDateString(),
            user_name: order.user_name || 'Guest'
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
        // Get sales data for the last 6 months
        const salesData = await Order.getMonthlySales(6);
        const formattedSalesData = Order.formatMonthlySalesData(salesData);
        
        // Get top 5 selling products
        const productsData = await OrderItem.getTopSellingProducts(5);
        const formattedProductsData = OrderItem.formatProductsData(productsData);

        // Calculate total sales for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentSales = await Order.getSalesByDateRange(thirtyDaysAgo, new Date());
        const formattedTotalSales = Order.calculateTotalSales(recentSales);

        // Get order statistics for the last 30 days
        const orderStats = await Order.getLast30DaysStats();

        // Get user statistics
        const userStats = await User.getStats();

        // Get product statistics
        const productStats = await Product.getStats();

        // Get recent orders
        const recentOrders = await Order.getRecentOrders(5);

        // Format chart data for sales
        const salesChartData = {
            type: 'line',
            data: {
                labels: formattedSalesData.map(item => item.month),
                datasets: [{
                    label: 'Monthly Sales',
                    data: formattedSalesData.map(item => parseFloat(item.total)),
                    borderColor: '#17a2b8',
                    backgroundColor: 'rgba(23, 162, 184, 0.1)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        };

        // Format chart data for products
        const productsChartData = {
            type: 'bar',
            data: {
                labels: formattedProductsData.map(item => item.name),
                datasets: [{
                    label: 'Products Sold',
                    data: formattedProductsData.map(item => parseInt(item.total_quantity)),
                    backgroundColor: '#28a745',
                    borderColor: '#28a745',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        };

        res.render('admin/analytics', {
            title: 'Analytics',
            salesData: formattedSalesData,
            productsData: formattedProductsData,
            formattedTotalSales,
            totalOrders: orderStats.totalOrders,
            totalRevenue: orderStats.totalRevenue.toFixed(2),
            pendingOrders: orderStats.pendingOrders,
            completedOrders: orderStats.completedOrders,
            totalUsers: userStats.totalUsers,
            totalAdmins: userStats.totalAdmins,
            totalCustomers: userStats.totalCustomers,
            totalProducts: productStats.totalProducts,
            inStockProducts: productStats.inStockProducts,
            outOfStockProducts: productStats.outOfStockProducts,
            totalCategories: productStats.totalCategories,
            recentOrders,
            salesChartData: JSON.stringify(salesChartData),
            productsChartData: JSON.stringify(productsChartData)
        });
    } catch (error) {
        console.error('Error in analytics:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading analytics data',
            error: process.env.NODE_ENV === 'development' ? error : {}
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

exports.dashboard = async (req, res) => {
    try {
        // Get total orders
        const totalOrders = await Order.count();

        // Get total revenue
        const totalRevenue = await Order.sum('total_amount');

        // Get pending orders count
        const pendingOrders = await Order.count({
            where: { status: 'pending' }
        });

        // Get completed orders count
        const completedOrders = await Order.count({
            where: { status: 'completed' }
        });

        // Get recent orders with formatted data
        const recentOrders = await Order.findAll({
            limit: 5,
            order: [['created_at', 'DESC']],
            include: [{
                model: User,
                attributes: ['name']
            }]
        });

        // Format recent orders data
        const formattedRecentOrders = recentOrders.map(order => ({
            id: order.id,
            user_name: order.User ? order.User.name : 'Guest',
            formatted_amount: parseFloat(order.total_amount).toFixed(2),
            status: order.status,
            formatted_date: new Date(order.created_at).toLocaleDateString()
        }));

        // Get monthly sales data
        const monthlySales = await Order.findAll({
            attributes: [
                [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('created_at')), 'month'],
                [sequelize.fn('SUM', sequelize.col('total_amount')), 'total']
            ],
            group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('created_at'))],
            order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('created_at')), 'ASC']]
        });

        // Format monthly sales data for chart with options
        const monthlySalesData = {
            type: 'line',
            data: {
                labels: monthlySales.map(item => new Date(item.getDataValue('month')).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })),
                datasets: [{
                    label: 'Sales',
                    data: monthlySales.map(item => parseFloat(item.getDataValue('total')).toFixed(2)),
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
        res.status(500).render('error', { message: 'Error loading dashboard' });
    }
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
            stock: parseInt(product.stock),
            description: product.description,
            status: product.status,
            image_url: product.image_url
        };

        res.json({
            success: true,
            product: formattedProduct
        });
    } catch (error) {
        console.error('Error in getProduct:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading product'
        });
    }
};

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/products')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
}).single('image');

// Upload product image
exports.uploadProductImage = (req, res) => {
    upload(req, res, function (err) {
        if (err) {
            console.error('Error uploading image:', err);
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

        // Return the full path that will be stored in the database
        const imagePath = `/images/products/${req.file.filename}`;
        
        res.json({
            success: true,
            url: imagePath
        });
    });
};

// Get product images
exports.getProductImages = async (req, res) => {
    try {
        const imagesDir = path.join(__dirname, '../public/images/products');
        
        // Create directory if it doesn't exist
        try {
            await fs.access(imagesDir);
        } catch (error) {
            await fs.mkdir(imagesDir, { recursive: true });
        }
        
        const files = await fs.readdir(imagesDir);
        
        const images = files
            .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
            .map(file => ({
                name: file,
                url: `/images/products/${file}`
            }));

        res.json(images);
    } catch (error) {
        console.error('Error getting product images:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading images'
        });
    }
};