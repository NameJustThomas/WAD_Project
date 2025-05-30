const pool = require('../config/database');

class UserProfile {
    constructor(id, userId, firstName, lastName, phone) {
        this.id = id;
        this.userId = userId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.phone = phone;
    }

    static async findByUserId(userId) {
        const [profiles] = await pool.query(
            'SELECT * FROM user_profiles WHERE user_id = ?',
            [userId]
        );
        return profiles.length ? new UserProfile(
            profiles[0].id,
            profiles[0].user_id,
            profiles[0].first_name,
            profiles[0].last_name,
            profiles[0].phone
        ) : null;
    }

    static async create(profileData) {
        try {
            const [result] = await pool.query(
                'INSERT INTO user_profiles (user_id, first_name, last_name, phone) VALUES (?, ?, ?, ?)',
                [
                    profileData.userId,
                    profileData.firstName,
                    profileData.lastName,
                    profileData.phone
                ]
            );
            return result.insertId;
        } catch (error) {
            throw error;
        }
    }

    static async update(userId, profileData) {
        const [result] = await pool.query(
            'UPDATE user_profiles SET first_name = ?, last_name = ?, phone = ? WHERE user_id = ?',
            [
                profileData.firstName,
                profileData.lastName,
                profileData.phone,
                userId
            ]
        );
        return result.affectedRows > 0;
    }

    static async delete(userId) {
        const [result] = await pool.query(
            'DELETE FROM user_profiles WHERE user_id = ?',
            [userId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = UserProfile; 