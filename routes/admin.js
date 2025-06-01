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
const upload = require('../middleware/upload');

// Apply auth middleware to all admin routes
router.use(auth);
router.use(isAdmin);

// Admin dashboard
router.get('/', adminController.index);

// Product management
router.get('/products', adminController.getProducts);
router.get('/products/:id', adminController.getProduct);
router.post('/products', upload.single('image'), adminController.createProduct);
router.put('/products/:id', upload.single('image'), adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// Product image management
router.get('/products/images', adminController.getProductImages);
router.post('/products/upload-image', adminController.uploadProductImage);
router.post('/products/set-primary-image', adminController.setPrimaryImage);
router.delete('/products/images/:imageId', adminController.deleteImage);
router.get('/products/:productId/images', adminController.getProductImages);

// Category management
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Order management
router.get('/orders', adminController.getOrders);
router.get('/orders/:id', adminController.getOrderDetails);
router.put('/orders/:orderId/status', adminController.updateOrderStatus);

// User management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Analytics
router.get('/analytics', adminController.analytics);
router.post('/analytics/data', adminController.getAnalyticsData);
router.post('/analytics/filter', adminController.filterAnalytics);
router.post('/analytics/export/:type', adminController.exportAnalytics);

module.exports = router; 