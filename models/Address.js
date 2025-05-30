const pool = require('../config/database');

class Address {
    constructor(id, userId, street, city, state, zipCode, isDefault) {
        this.id = id;
        this.userId = userId;
        this.street = street;
        this.city = city;
        this.state = state;
        this.zipCode = zipCode;
        this.isDefault = isDefault;
    }

    static async findByUserId(userId) {
        const [addresses] = await pool.query(
            'SELECT * FROM addresses WHERE userId = ?',
            [userId]
        );
        return addresses.map(addr => new Address(
            addr.id,
            addr.userId,
            addr.street,
            addr.city,
            addr.state,
            addr.zipCode,
            addr.isDefault
        ));
    }

    static async findById(id) {
        const [addresses] = await pool.query(
            'SELECT * FROM addresses WHERE id = ?',
            [id]
        );
        return addresses.length ? new Address(
            addresses[0].id,
            addresses[0].userId,
            addresses[0].street,
            addresses[0].city,
            addresses[0].state,
            addresses[0].zipCode,
            addresses[0].isDefault
        ) : null;
    }

    static async create(addressData) {
        try {
            // Nếu địa chỉ mới là default, cập nhật tất cả địa chỉ khác thành không default
            if (addressData.isDefault) {
                await pool.query(
                    'UPDATE addresses SET isDefault = FALSE WHERE userId = ?',
                    [addressData.userId]
                );
            }

            const [result] = await pool.query(
                'INSERT INTO addresses (userId, street, city, state, zipCode, isDefault) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    addressData.userId,
                    addressData.street,
                    addressData.city,
                    addressData.state,
                    addressData.zipCode,
                    addressData.isDefault || false
                ]
            );
            return result.insertId;
        } catch (error) {
            throw error;
        }
    }

    static async update(id, addressData) {
        try {
            // Nếu địa chỉ được cập nhật thành default, cập nhật tất cả địa chỉ khác
            if (addressData.isDefault) {
                await pool.query(
                    'UPDATE addresses SET isDefault = FALSE WHERE userId = ? AND id != ?',
                    [addressData.userId, id]
                );
            }

            const [result] = await pool.query(
                'UPDATE addresses SET street = ?, city = ?, state = ?, zipCode = ?, isDefault = ? WHERE id = ?',
                [
                    addressData.street,
                    addressData.city,
                    addressData.state,
                    addressData.zipCode,
                    addressData.isDefault || false,
                    id
                ]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        const [result] = await pool.query('DELETE FROM addresses WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    static async setDefault(id, userId) {
        try {
            // Cập nhật tất cả địa chỉ khác thành không default
            await pool.query(
                'UPDATE addresses SET isDefault = FALSE WHERE userId = ?',
                [userId]
            );

            // Cập nhật địa chỉ được chọn thành default
            const [result] = await pool.query(
                'UPDATE addresses SET isDefault = TRUE WHERE id = ?',
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Address; 