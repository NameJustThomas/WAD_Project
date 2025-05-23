/**
 * Admin Routes
 * Purpose: Define administrative routes
 * Features:
 * - Dashboard access
 * - Product management
 * - User management
 * - Order management
 * - Category management
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, isAdmin } = require('../middleware/auth');

// Admin dashboard
router.get('/', auth, isAdmin, (req, res) => adminController.index(req, res));

// Product management
router.get('/products', auth, isAdmin, (req, res) => adminController.getProducts(req, res));
router.get('/products/:id', auth, isAdmin, (req, res) => adminController.getProduct(req, res));
router.post('/products', auth, isAdmin, (req, res) => adminController.createProduct(req, res));
router.put('/products/:id', auth, isAdmin, (req, res) => adminController.updateProduct(req, res));
router.delete('/products/:id', auth, isAdmin, (req, res) => adminController.deleteProduct(req, res));

// Product image management
router.get('/products/images', auth, isAdmin, (req, res) => adminController.getProductImages(req, res));
router.post('/products/upload-image', auth, isAdmin, (req, res) => adminController.uploadProductImage(req, res));

// Category management
router.get('/categories', auth, isAdmin, (req, res) => adminController.getCategories(req, res));
router.post('/categories', auth, isAdmin, (req, res) => adminController.createCategory(req, res));
router.put('/categories/:id', auth, isAdmin, (req, res) => adminController.updateCategory(req, res));
router.delete('/categories/:id', auth, isAdmin, (req, res) => adminController.deleteCategory(req, res));

// Order management
router.get('/orders', auth, isAdmin, (req, res) => adminController.getOrders(req, res));
router.put('/orders/:id', auth, isAdmin, (req, res) => adminController.updateOrder(req, res));

// User management
router.get('/users', auth, isAdmin, (req, res) => adminController.getUsers(req, res));
router.put('/users/:id', auth, isAdmin, (req, res) => adminController.updateUser(req, res));
router.delete('/users/:id', auth, isAdmin, (req, res) => adminController.deleteUser(req, res));

// Analytics
router.get('/analytics', auth, isAdmin, (req, res) => adminController.analytics(req, res));
router.post('/analytics/data', auth, isAdmin, (req, res) => adminController.getAnalyticsData(req, res));
router.post('/analytics/filter', auth, isAdmin, (req, res) => adminController.filterAnalytics(req, res));
router.post('/analytics/export/:type', auth, isAdmin, (req, res) => adminController.exportAnalytics(req, res));

module.exports = router; 