const User = require('../models/User');

module.exports = async (req, res, next) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Get user from database
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Check if user is admin
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        // Add user to request
        req.admin = user;
        next();
    } catch (error) {
        console.error('Error in adminAuth middleware:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 