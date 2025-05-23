/**
 * Home Routes
 * Purpose: Define homepage and general site routes
 * Features:
 * - Homepage display
 * - Featured products
 * - Popular categories
 * - Site search
 */

const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// Home page
router.get('/', homeController.getHome);

module.exports = router; 