/**
 * Category Routes
 * Purpose: Define category-related routes
 * Features:
 * - Category listing
 * - Category details
 * - Products by category
 * - Category management (admin)
 */

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Get all categories
router.get('/', categoryController.index);

// Get category by ID
router.get('/:id', categoryController.getCategoryById);

// Create new category
router.post('/', categoryController.create);

// Update category
router.put('/:id', categoryController.update);

// Delete category
router.delete('/:id', categoryController.delete);

module.exports = router; 