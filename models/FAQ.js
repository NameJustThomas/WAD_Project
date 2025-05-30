// models/FAQ.js
const pool = require('../config/database');

const FAQ = {
  async findByProductId(productId) {
    const [rows] = await pool.query(
      'SELECT * FROM faqs WHERE product_id = ? ORDER BY id DESC',
      [productId]
    );
    return rows;
  },

  async create({ product_id, question, answer }) {
    const [result] = await pool.query(
      'INSERT INTO faqs (product_id, question, answer) VALUES (?, ?, ?)',
      [product_id, question, answer]
    );
    return { id: result.insertId, product_id, question, answer };
  },

  async update(id, { question, answer }) {
    const [result] = await pool.query(
      'UPDATE faqs SET question = ?, answer = ? WHERE id = ?',
      [question, answer, id]
    );
    return result.affectedRows > 0;
  },

  async delete(id) {
    const [result] = await pool.query(
      'DELETE FROM faqs WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
};

module.exports = FAQ;
