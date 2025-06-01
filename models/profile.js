const db = require('../config/database'); // Your database connection (mysql2/promise instance)

const getUserById = async (id) => {
  const [rows] = await db.execute(
    `SELECT p.*, u.username, u.email 
     FROM profiles p
     JOIN users u ON p.user_id = u.id
     WHERE p.user_id = ? LIMIT 1`,
    [id]
  );
  return rows[0];
};

const findByUserId = async (userId) => {
  const [rows] = await db.execute(
    `SELECT * FROM profiles WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  return rows[0];
};

const create = async (profileData) => {
  const { userId, firstName, lastName, phone } = profileData;
  const [result] = await db.execute(
    `INSERT INTO profiles (user_id, first_name, last_name, phone)
     VALUES (?, ?, ?, ?)`,
    [userId, firstName, lastName, phone]
  );
  return result.insertId;
};

const updateUserProfile = async (id, profileData) => {
  const { first_name, last_name, address, city, state, zip_code } = profileData;

  const [result] = await db.execute(
    `UPDATE profiles
     SET first_name = ?, last_name = ?, address = ?, city = ?, state = ?, zip_code = ?
     WHERE user_id = ?`,
    [first_name, last_name, address, city, state, zip_code, id]
  );

  return result.affectedRows === 1;
};

module.exports = {
  getUserById,
  findByUserId,
  create,
  updateUserProfile,
};
