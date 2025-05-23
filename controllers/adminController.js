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
        let totalProducts = 0;
        let totalCategories = 0;
        let totalOrders = 0;
        let totalUsers = 0;
        let recentOrders = [];
        let topProducts = [];
        let totalRevenue = 0;
        let pendingOrders = 0;
        let completedOrders = 0;
        let monthlySales = [];

        try {
            totalProducts = await Product.count();
        } catch (error) {
            console.error('Error getting total products:', error);
        }

        try {
            totalCategories = await Category.count();
        } catch (error) {
            console.error('Error getting total categories:', error);
        }

        try {
            totalOrders = await Order.count();
        } catch (error) {
            console.error('Error getting total orders:', error);
        }

        try {
            totalUsers = await User.count();
        } catch (error) {
            console.error('Error getting total users:', error);
        }

        try {
            recentOrders = await Order.findRecent(5);
            // Format order data
            recentOrders = recentOrders.map(order => ({
                ...order,
                formatted_amount: parseFloat(order.total_amount || 0).toFixed(2),
                formatted_date: new Date(order.created_at).toLocaleDateString()
            }));
        } catch (error) {
            console.error('Error getting recent orders:', error);
        }

        try {
            topProducts = await Product.getTopSelling(5);
            // Format product data
            topProducts = topProducts.map(product => ({
                ...product,
                formatted_price: parseFloat(product.price || 0).toFixed(2)
            }));
        } catch (error) {
            console.error('Error getting top products:', error);
        }

        try {
            const [revenueResult] = await pool.query(`
                SELECT COALESCE(SUM(total_amount), 0) as total
                FROM orders
                WHERE status = 'completed'
            `);
            totalRevenue = parseFloat(revenueResult[0].total) || 0;
        } catch (error) {
            console.error('Error getting total revenue:', error);
        }

        try {
            const [pendingResult] = await pool.query(`
                SELECT COUNT(*) as count
                FROM orders
                WHERE status = 'pending'
            `);
            pendingOrders = parseInt(pendingResult[0].count) || 0;
        } catch (error) {
            console.error('Error getting pending orders:', error);
        }

        try {
            const [completedResult] = await pool.query(`
                SELECT COUNT(*) as count
                FROM orders
                WHERE status = 'completed'
            `);
            completedOrders = parseInt(completedResult[0].count) || 0;
        } catch (error) {
            console.error('Error getting completed orders:', error);
        }

        try {
            const [monthlyResult] = await pool.query(`
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    COALESCE(SUM(total_amount), 0) as total
                FROM orders
                WHERE status = 'completed'
                AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month ASC
            `);
            monthlySales = monthlyResult.map(row => ({
                month: row.month,
                total: parseFloat(row.total) || 0
            }));
        } catch (error) {
            console.error('Error getting monthly sales:', error);
        }

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            totalProducts,
            totalCategories,
            totalOrders,
            totalUsers,
            recentOrders,
            topProducts,
            totalRevenue: totalRevenue.toFixed(2),
            pendingOrders,
            completedOrders,
            monthlySales
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
        const products = await Product.findAll();
        const categories = await Category.findAll();
        
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
        const errors = await Product.validate(req.body);
        if (errors) {
            return res.status(400).json({ errors });
        }

        const success = await Product.update(req.params.id, req.body);
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product updated successfully'
        });
    } catch (error) {
        console.error('Error in updateProduct:', error);
        res.status(500).json({
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
        res.render('admin/categories/index', {
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
        const errors = await Category.validate(req.body);
        if (errors) {
            return res.status(400).json({ errors });
        }

        const success = await Category.update(req.params.id, req.body);
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            message: 'Category updated successfully'
        });
    } catch (error) {
        console.error('Error in updateCategory:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating category'
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
        const success = await Order.update(req.params.id, req.body);
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            message: 'Order updated successfully'
        });
    } catch (error) {
        console.error('Error in updateOrder:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating order'
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
        const success = await User.update(req.params.id, req.body);
        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Error in updateUser:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user'
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
        const salesData = await Order.getMonthlySales(6);
        const productsData = await OrderItem.getTopSellingProducts(5);

        // Format data for charts
        const salesChartData = {
            labels: salesData.map(item => item.month),
            values: salesData.map(item => item.total)
        };

        const productsChartData = {
            labels: productsData.map(item => item.name),
            values: productsData.map(item => item.total_quantity)
        };

        res.render('admin/analytics', {
            title: 'Analytics',
            salesChartData,
            productsChartData
        });
    } catch (error) {
        console.error('Error in analytics:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading analytics',
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