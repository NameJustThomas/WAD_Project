/**
 * Product Routes
 * Purpose: Define product-related routes
 * Features:
 * - Product listing
 * - Product details
 * - Product search
 * - Category filtering
 * - Product management (admin)
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const cartController = require('../controllers/cartController');
const { auth, isAdmin } = require('../middleware/auth');

// Public routes
router.get('/', productController.index);
router.get('/search', productController.search);
router.get('/category/:categoryId', productController.getByCategory);
router.get('/:id', productController.show);

// Cart routes
router.post('/:id/add-to-cart', productController.addToCart);

// Admin routes
router.post('/', auth, isAdmin, (req, res) => productController.create(req, res));
router.put('/:id', auth, isAdmin, (req, res) => productController.update(req, res));
router.delete('/:id', auth, isAdmin, (req, res) => productController.delete(req, res));

// API routes
router.get('/api/featured', (req, res) => productController.getFeaturedProducts(req, res));
router.get('/api/top-selling', (req, res) => productController.getTopSellingProducts(req, res));

module.exports = router; 