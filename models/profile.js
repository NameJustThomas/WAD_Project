const db = require('../config/database'); // Your database connection (mysql2/promise instance)

const getUserById = async (id) => {
  const [rows] = await db.execute(
    `SELECT id, username, email, firstName, lastName, address, city, state, zipCode, created_at 
     FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0];
};

const updateUserProfile = async (id, profileData) => {
  const { firstName, lastName, email, address, city, state, zipCode } = profileData;

  const [result] = await db.execute(
    `UPDATE users
     SET firstName = ?, lastName = ?, email = ?, address = ?, city = ?, state = ?, zipCode = ?
     WHERE id = ?`,
    [firstName, lastName, email, address, city, state, zipCode, id]
  );

  return result.affectedRows === 1;
};

module.exports = {
  getUserById,
  updateUserProfile,
};
