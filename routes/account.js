/**
 * Account Routes
 * Purpose: Define user account management routes
 * Features:
 * - View and edit profile
 * - Manage addresses
 * - View orders
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const accountController = require('../controllers/accountController');
const UserProfile = require('../models/UserProfile');
const Address = require('../models/Address');
const Order = require('../models/Order');

// Show profile page
router.get('/profile', auth, (req, res) => {
    // Set checkout intent if coming from checkout
    if (req.query.checkout === 'true') {
        req.session.checkoutIntent = true;
    }
    accountController.getProfile(req, res);
});

// Update profile
router.post('/profile', auth, accountController.updateProfile);

// Address routes
router.get('/addresses/:id/edit', auth, accountController.getAddressForEdit);
router.post('/addresses', auth, accountController.addAddress);
router.post('/addresses/:id', auth, accountController.updateAddress);
router.delete('/addresses/:id', auth, accountController.deleteAddress);
router.post('/addresses/:id/default', auth, accountController.setDefault);

// Show orders page
router.get('/orders', auth, async (req, res) => {
    try {
        const orders = await Order.findByUserId(req.user.id);
        res.render('account/orders', {
            title: 'My Orders',
            orders: orders
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        req.flash('error', 'Error loading orders');
        res.redirect('/');
    }
});

// Show order details
router.get('/orders/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order || order.user_id !== req.user.id) {
            req.flash('error', 'Order not found');
            return res.redirect('/account/orders');
        }
        res.render('account/order-details', {
            title: 'Order Details',
            order: order
        });
    } catch (error) {
        console.error('Error loading order details:', error);
        req.flash('error', 'Error loading order details');
        res.redirect('/account/orders');
    }
});

module.exports = router; 