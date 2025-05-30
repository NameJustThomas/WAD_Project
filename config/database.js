/**
 * Database Configuration
 * Purpose: Configure database connection
 * Features:
 * - MySQL connection setup
 * - Connection pooling
 * - Error handling
 * - Environment variables
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Th.ang2511',
    database: process.env.DB_NAME || 'onlineshop',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool; 