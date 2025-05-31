/**
 * Main application file
 * Purpose: Entry point of the application
 * Features:
 * - Express server setup
 * - Database connection
 * - Middleware configuration
 * - Route registration
 * - Error handling
 * - Session management
 * - Static file serving
 */

const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Session middleware
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));

app.use(flash());

// Flash messages to res.locals
app.use((req, res, next) => {
    res.locals.messages = req.flash();
    next();
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Add path to all routes
app.use((req, res, next) => {
    res.locals.path = req.path;
    next();
});

// Add user object to all routes
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Add cart count to all routes
app.use((req, res, next) => {
    res.locals.cartCount = req.session.cart ? req.session.cart.reduce((total, item) => total + item.quantity, 0) : 0;
    next();
});

// Import routes
const homeRouter = require('./routes/home');
const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const cartRouter = require('./routes/cart');
const adminRouter = require('./routes/admin');
const authRouter = require('./routes/auth');
const couponRouter = require('./routes/coupons'); // ✅ Added

// Use routes
app.use('/', homeRouter);
app.use('/products', productsRouter);
app.use('/categories', categoriesRouter);
app.use('/cart', cartRouter);
app.use('/admin', adminRouter);
app.use('/', authRouter);
app.use('/', couponRouter); // ✅ Registered coupon routes

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).render('error', {
        title: 'Error',
        message: err.message || 'Something went wrong',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Not Found',
        message: 'Page not found',
        error: {}
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
