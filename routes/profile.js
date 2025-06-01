const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

// Middleware to check if user is logged in
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// Show user profile page
router.get('/', ensureAuthenticated, profileController.showProfile);

// Show edit profile form
router.get('/edit', ensureAuthenticated, profileController.showEditProfile);

// Handle edit profile form submission
router.post('/edit', ensureAuthenticated, profileController.updateProfile);

module.exports = router;
