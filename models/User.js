/**
 * User Model
 * Purpose: Handle user data and operations
 * Features:
 * - User registration and authentication
 * - Profile management
 * - Role-based access control
 * - Password hashing
 * - Session management
 * - User preferences
 */

// models/User.js
// This is a placeholder for your User model logic
// You would typically interact with a database here

const pool = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  constructor(id, username, email, password, role) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.password = password;
    this.role = role;
  }

  // Example static method to simulate fetching a user
  static async findByEmail(email) {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return users.length ? new User(
      users[0].id,
      users[0].username,
      users[0].email,
      users[0].password,
      users[0].role
    ) : null;
  }

  static async findById(id) {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return users.length ? new User(
      users[0].id,
      users[0].username,
      users[0].email,
      users[0].password,
      users[0].role
    ) : null;
  }

  static async findAll() {
    const [users] = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    return users.map(user => new User(
      user.id,
      user.username,
      user.email,
      user.password,
      user.role
    ));
  }

  static async create(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const [result] = await pool.query(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [userData.username, userData.email, hashedPassword, userData.role || 'user']
      );
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  static async update(id, userData) {
    const { username, email, role } = userData;
    const [result] = await pool.query(
      'UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?',
      [username, email, role, id]
    );
    return result.affectedRows > 0;
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const [result] = await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async verifyPassword(password, hashedPassword) {
    if (!password || !hashedPassword) {
      return false;
    }
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  static async findByUsername(username) {
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return users.length ? new User(
      users[0].id,
      users[0].username,
      users[0].email,
      users[0].password,
      users[0].role
    ) : null;
  }

  static async count() {
    const [result] = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result[0].count);
  }

  static async getStats() {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as totalUsers,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as totalAdmins,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as totalCustomers
      FROM users
    `);
    
    return {
      totalUsers: parseInt(stats[0].totalUsers || 0),
      totalAdmins: parseInt(stats[0].totalAdmins || 0),
      totalCustomers: parseInt(stats[0].totalCustomers || 0)
    };
  }

  static async validate(data) {
    const errors = {};
    
    if (!data.name || data.name.length < 3) {
      errors.name = 'Name must be at least 3 characters long';
    }
    
    if (!data.email || !data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!data.password || data.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    
    return Object.keys(errors).length === 0 ? null : errors;
  }

  static async validateUpdate(data) {
    const errors = {};
    
    if (data.name && data.name.length < 3) {
      errors.name = 'Name must be at least 3 characters long';
    }
    
    if (data.email && !data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (data.password && data.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    
    return Object.keys(errors).length === 0 ? null : errors;
  }
}

module.exports = User; 