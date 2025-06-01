const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function runMigrations() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'onlineshop',
        multipleStatements: true
    });

    try {
        console.log('Running migrations...');

        // Read and execute addresses table migration
        const addressesSql = await fs.readFile(
            path.join(__dirname, 'create_addresses_table.sql'),
            'utf8'
        );
        await connection.query(addressesSql);
        console.log('Created addresses table successfully');

        console.log('All migrations completed successfully');
    } catch (error) {
        console.error('Error running migrations:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

runMigrations().catch(console.error); 