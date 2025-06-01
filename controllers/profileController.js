// controllers/profileController.js
const db = require('../config/database'); // Your database connection module

// Show user profile page
exports.showProfile = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const userId = req.session.user.id;

  try {
    // Fetch user and profile info from DB
    const [userRows] = await db.query('SELECT id, username, email, role FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) {
      req.flash('error', 'User not found');
      return res.redirect('/login');
    }
    const user = userRows[0];

    const [profileRows] = await db.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    const profile = profileRows[0] || {};

    res.render('user/profile', {
      title: 'My Profile',
      user,
      profile,
      messages: req.flash()
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', message: 'Failed to load profile' });
  }
};

// Show edit profile form
exports.showEditProfile = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const userId = req.session.user.id;

  try {
    const [userRows] = await db.query('SELECT id, username, email FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) {
      req.flash('error', 'User not found');
      return res.redirect('/login');
    }
    const user = userRows[0];

    const [profileRows] = await db.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    const profile = profileRows[0] || {};

    res.render('user/profile', {
      title: 'Edit Profile',
      user,
      profile,
      errors: null,
      messages: req.flash()
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Error', message: 'Failed to load edit form' });
  }
};

// Handle profile edit form submission
exports.updateProfile = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const userId = req.session.user.id;
  const { firstName, lastName, email, address, city, state, zipCode } = req.body;
  const errors = [];

  // Basic validation
  if (!firstName || firstName.trim() === '') errors.push('First Name is required');
  if (!lastName || lastName.trim() === '') errors.push('Last Name is required');
  if (!email || email.trim() === '') errors.push('Email is required');

  if (errors.length > 0) {
    return res.render('user/profile', {
      title: 'Edit Profile',
      user: { id: userId, email },
      profile: { first_name: firstName, last_name: lastName, address, city, state, zip_code: zipCode },
      errors,
      messages: req.flash()
    });
  }

  try {
    // Get existing profile data
    const [existingProfile] = await db.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    const currentProfile = existingProfile[0] || {};

    // Update email in users table
    await db.query('UPDATE users SET email = ? WHERE id = ?', [email, userId]);

    if (existingProfile.length > 0) {
      // Update profile with new data, preserving existing data if not provided
      await db.query(
        `UPDATE profiles SET 
          first_name = ?, 
          last_name = ?, 
          address = IF(? IS NULL OR ? = '', address, ?), 
          city = IF(? IS NULL OR ? = '', city, ?), 
          state = IF(? IS NULL OR ? = '', state, ?), 
          zip_code = IF(? IS NULL OR ? = '', zip_code, ?)
         WHERE user_id = ?`,
        [
          firstName,
          lastName,
          address, address, address,
          city, city, city,
          state, state, state,
          zipCode, zipCode, zipCode,
          userId
        ]
      );
    } else {
      // Insert new profile with provided data
      await db.query(
        `INSERT INTO profiles (user_id, first_name, last_name, address, city, state, zip_code)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, firstName, lastName, address || null, city || null, state || null, zipCode || null]
      );
    }

    // Update session user email
    req.session.user.email = email;

    req.flash('success', 'Profile updated successfully.');
    res.redirect('/profile');
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).render('user/profile', {
      title: 'Edit Profile',
      user: { id: userId, email },
      profile: { first_name: firstName, last_name: lastName, address, city, state, zip_code: zipCode },
      errors: ['Failed to update profile. Please try again later.'],
      messages: req.flash()
    });
  }
};
