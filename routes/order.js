/**
 * Order Routes
 * Purpose: Define order related routes
 * Features:
 * - View orders
 * - View order details
 * - Create order
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { auth } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// View orders
router.get('/', orderController.getOrders);

// View order details
router.get('/:id', orderController.getOrderDetails);

// Create order
router.post('/create', orderController.createOrder);

module.exports = router; 