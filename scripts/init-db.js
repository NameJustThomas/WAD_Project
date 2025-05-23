/**
 * Database Initialization Script
 * Purpose: Initialize database with sample data
 * Features:
 * - Create database tables
 * - Insert sample products
 * - Insert sample categories
 * - Insert sample users
 * - Insert sample orders
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
    let connection;
    try {
        // Connect to MySQL server without specifying database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'admin'
        });

        console.log('Connected to MySQL server');

        // Read and execute SQL file
        const sqlFile = await fs.readFile(path.join(__dirname, '../database.sql'), 'utf8');
        const statements = sqlFile.split(';').filter(stmt => stmt.trim());

        for (const statement of statements) {
            if (statement.trim()) {
                await connection.query(statement);
                console.log('Executed SQL statement');
            }
        }

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

initializeDatabase().catch(console.error); 