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

const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(id, username, email, password, role) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.password = password;
    this.role = role;
  }

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

  static async create(userData) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const [result] = await pool.query(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [
                userData.username,
                userData.email,
                hashedPassword,
                userData.role || 'user'
            ]
      );
      return result.insertId;
  }

  static async update(id, userData) {
    const [result] = await pool.query(
            'UPDATE users SET username = ?, email = ? WHERE id = ?',
            [userData.username, userData.email, id]
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
        const [result] = await pool.query(
            'DELETE FROM users WHERE id = ?',
            [id]
        );
    return result.affectedRows > 0;
  }

    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async findByUsername(username) {
        const [users] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
    return users.length ? new User(
      users[0].id,
      users[0].username,
      users[0].email,
      users[0].password,
      users[0].role
    ) : null;
  }

    static async getAddresses(userId) {
        const [addresses] = await pool.query(
            'SELECT * FROM addresses WHERE userId = ?',
            [userId]
        );
        return addresses;
  }

    static async count(where = '') {
        const [result] = await pool.query(
            `SELECT COUNT(*) as count FROM users ${where}`
        );
        return result[0].count;
    }

    static async findAll(where = '', params = []) {
        const [users] = await pool.query(
            `SELECT * FROM users ${where}`,
            params
        );
        return users.map(user => new User(
            user.id,
            user.username,
            user.email,
            user.password,
            user.role
        ));
  }

    static async updateResetToken(id, token, expires) {
        const [result] = await pool.query(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
            [token, expires, id]
        );
        return result.affectedRows > 0;
  }

    static async findByResetToken(token) {
        const [users] = await pool.query(
            'SELECT * FROM users WHERE reset_token = ?',
            [token]
        );
        return users.length ? new User(
            users[0].id,
            users[0].username,
            users[0].email,
            users[0].password,
            users[0].role
        ) : null;
    }
    
    static async clearResetToken(id) {
        const [result] = await pool.query(
            'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
  }
}

module.exports = User; 