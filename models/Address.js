const db = require('../config/database');

const Address = {
    // Find address by ID
    findById: async (id) => {
        const [rows] = await db.execute(
            `SELECT * FROM addresses WHERE id = ? LIMIT 1`,
            [id]
        );
        return rows[0];
    },

    // Find all addresses for a user
    findByUserId: async (userId) => {
        const [rows] = await db.execute(
            `SELECT * FROM addresses WHERE user_id = ?`,
            [userId]
        );
        return rows;
    },

    // Create new address
    create: async (addressData) => {
        const { userId, firstName, lastName, email, address, city, state, zipCode } = addressData;
        const [result] = await db.execute(
            `INSERT INTO addresses (user_id, first_name, last_name, email, address, city, state, zip_code)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, firstName, lastName, email, address, city, state, zipCode]
        );
        return result.insertId;
    },

    // Update existing address
    update: async (id, addressData) => {
        const { firstName, lastName, email, address, city, state, zipCode } = addressData;
        const [result] = await db.execute(
            `UPDATE addresses 
             SET first_name = ?, last_name = ?, email = ?, address = ?, city = ?, state = ?, zip_code = ?
             WHERE id = ?`,
            [firstName, lastName, email, address, city, state, zipCode, id]
        );
        return result.affectedRows === 1;
    },

    // Delete address
    delete: async (id) => {
        const [result] = await db.execute(
            `DELETE FROM addresses WHERE id = ?`,
            [id]
        );
        return result.affectedRows === 1;
    }
};

module.exports = Address; 