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
    const [userRows] = await db.query('SELECT id, username, email FROM users WHERE id = ?', [userId]);
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

    res.render('editProfile', {
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
  // You could add email format validation here

  if (errors.length > 0) {
    return res.render('editProfile', {
      title: 'Edit Profile',
      user: { id: userId, email },   // only keep fields that matter here
      profile: { first_name: firstName, last_name: lastName, address, city, state, zip_code: zipCode },
      errors,
      messages: req.flash()
    });
  }

  try {
    // Update email in users table (optional: check email uniqueness)
    await db.query('UPDATE users SET email = ? WHERE id = ?', [email, userId]);

    // Check if profile exists
    const [existingProfile] = await db.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);

    if (existingProfile.length > 0) {
      // Update profile
      await db.query(
        `UPDATE profiles SET first_name = ?, last_name = ?, address = ?, city = ?, state = ?, zip_code = ?
         WHERE user_id = ?`,
        [firstName, lastName, address, city, state, zipCode, userId]
      );
    } else {
      // Insert new profile
      await db.query(
        `INSERT INTO profiles (user_id, first_name, last_name, address, city, state, zip_code)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, firstName, lastName, address, city, state, zipCode]
      );
    }

    // Optionally update session user email here if you want immediate effect
    req.session.user.email = email;

    req.flash('success', 'Profile updated successfully.');
    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).render('editProfile', {
      title: 'Edit Profile',
      user: { id: userId, email },
      profile: { first_name: firstName, last_name: lastName, address, city, state, zip_code: zipCode },
      errors: ['Failed to update profile. Please try again later.'],
      messages: req.flash()
    });
  }
};
