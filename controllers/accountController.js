const UserProfile = require('../models/UserProfile');
const Address = require('../models/Address');
const pool = require('../config/database');

// Get profile page
exports.getProfile = async (req, res) => {
    try {
        const profile = await UserProfile.findByUserId(req.user.id);
        const addresses = await Address.findByUserId(req.user.id);
        res.render('account/profile', {
            title: 'My Profile',
            profile: profile,
            addresses: addresses
        });
    } catch (error) {
        console.error('Error loading profile:', error);
        req.flash('error', 'Error loading profile');
        res.redirect('/');
    }
};

// Update profile
exports.updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, phone } = req.body;
        const userId = req.user.id;

        // Check if profile exists
        let profile = await UserProfile.findByUserId(userId);
        
        if (profile) {
            // Update existing profile
            await UserProfile.update(userId, { firstName, lastName, phone });
        } else {
            // Create new profile
            await UserProfile.create({ userId, firstName, lastName, phone });
        }

        req.flash('success', 'Profile updated successfully');
        
        // If coming from checkout, redirect back
        if (req.session.checkoutIntent) {
            delete req.session.checkoutIntent;
            return res.redirect('/checkout');
        }
        
        res.redirect('/account/profile');
    } catch (error) {
        console.error('Error updating profile:', error);
        req.flash('error', 'Error updating profile');
        res.redirect('/account/profile');
    }
};

// Get address for editing
exports.getAddressForEdit = async (req, res) => {
    try {
        const address = await Address.findById(req.params.id);
        if (!address || address.userId !== req.user.id) {
            return res.status(404).json({ error: 'Address not found' });
        }
        res.json(address);
    } catch (error) {
        console.error('Error getting address:', error);
        res.status(500).json({ error: 'Error getting address' });
    }
};

// Add new address
exports.addAddress = async (req, res) => {
    try {
        const { street, city, state, zipCode, isDefault } = req.body;
        const userId = req.user.id;

        // Convert isDefault from 'on' to boolean
        const isDefaultAddress = isDefault === 'on';

        // If this is set as default, update all other addresses
        if (isDefaultAddress) {
            await pool.query(
                'UPDATE addresses SET isDefault = FALSE WHERE userId = ?',
                [userId]
            );
        }

        const addressId = await Address.create({
            userId,
            street,
            city,
            state,
            zipCode,
            isDefault: isDefaultAddress
        });

        req.flash('success', 'Address added successfully');
        res.redirect('/account/profile');
    } catch (error) {
        console.error('Error adding address:', error);
        req.flash('error', 'Error adding address');
        res.redirect('/account/profile');
    }
};

// Update address
exports.updateAddress = async (req, res) => {
    try {
        const { street, city, state, zipCode, isDefault } = req.body;
        const addressId = req.params.id;
        const userId = req.user.id;

        // Convert isDefault from 'on' to boolean
        const isDefaultAddress = isDefault === 'on';

        // Verify address belongs to user
        const address = await Address.findById(addressId);
        if (!address || address.userId !== userId) {
            req.flash('error', 'Address not found');
            return res.redirect('/account/profile');
        }

        // If this is set as default, update all other addresses
        if (isDefaultAddress) {
            await pool.query(
                'UPDATE addresses SET isDefault = FALSE WHERE userId = ? AND id != ?',
                [userId, addressId]
            );
        }

        await Address.update(addressId, {
            street,
            city,
            state,
            zipCode,
            isDefault: isDefaultAddress
        });

        req.flash('success', 'Address updated successfully');
        res.redirect('/account/profile');
    } catch (error) {
        console.error('Error updating address:', error);
        req.flash('error', 'Error updating address');
        res.redirect('/account/profile');
    }
};

// Delete address
exports.deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.user.id;

        // Verify address belongs to user
        const address = await Address.findById(addressId);
        if (!address || address.userId !== userId) {
            return res.status(404).json({ error: 'Address not found' });
        }

        await Address.delete(addressId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ error: 'Error deleting address' });
    }
};

// Set default address
exports.setDefault = async (req, res) => {
    try {
        const addressId = req.params.id;
        const userId = req.user.id;

        // Verify address belongs to user
        const address = await Address.findById(addressId);
        if (!address || address.userId !== userId) {
            return res.status(404).json({ error: 'Address not found' });
        }

        // Set new default using the model's method
        await Address.setDefault(addressId, userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error setting default address:', error);
        res.status(500).json({ error: 'Error setting default address' });
    }
}; 