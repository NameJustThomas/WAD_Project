/**
 * Order Routes
 * Purpose: Define user order routes
 * Features:
 * - View user orders
 * - View order details
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { auth } = require('../middleware/auth');

// User order routes
router.get('/orders', auth, orderController.getOrders);
router.get('/orders/:id', auth, orderController.getOrderDetails);

module.exports = router; 