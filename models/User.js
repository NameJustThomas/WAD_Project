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
//User class is a blueprint for creating user objects
class User {
  constructor(id, username, email, password, role) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.password = password;
    this.role = role;
  }
  //findByEmail is a static method that can be called on the User class
  // Example static method to simulate fetching a user
  static async findByEmail(email) {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return users.length ? new User(//if user exists, return user object
      users[0].id,
      users[0].username,
      users[0].email,
      users[0].password,
      users[0].role
    ) : null;
  }
  //findById is a static method that can be called on the User class
  static async findById(id) {
    try {
      const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      return users[0] || null;
    } catch (error) {
      console.error('Error in findById:', error);
      throw error;
    }
  }
  //findAll is a static method that can be called on the User class
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
  //create is a static method that can be called on the User class
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
  //update is a static method that can be called on the User class
  static async update(id, data) {
    try {
      const [result] = await pool.query(
        'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
        [data.name, data.email, data.role, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in update:', error);
      throw error;
    }
  }
  //updatePassword is a static method that can be called on the User class
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const [result] = await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
    return result.affectedRows > 0;
  }
  //delete is a static method that can be called on the User class
  static async delete(id) {
    try {
      const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in delete:', error);
      throw error;
    }
  }
  //verifyPassword is a static method that can be called on the User class
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
  //findByUsername is a static method that can be called on the User class
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
  //count is a static method that can be called on the User class
  static async count() {
    const [result] = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result[0].count);
  }
  //getStats is a static method that can be called on the User class  
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
  //validate is a static method that can be called on the User class
  static async validate(data) {
    const errors = {};
    
    if (!data.name || data.name.length < 3) {
      errors.name = 'Name must be at least 3 characters long';
    }
    
    if (!data.email || !data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (data.password && data.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    
    return Object.keys(errors).length === 0 ? null : errors;
  }
  //validateUpdate is a static method that can be called on the User class    
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
  static async updateStatus(id, status) {
    try {
      const [result] = await pool.query(
        'UPDATE users SET status = ? WHERE id = ?',
        [status, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error in updateStatus:', error);
      throw error;
    }
  }
}

module.exports = User; 