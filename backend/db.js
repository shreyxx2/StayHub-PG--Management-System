const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'stayhub_pg',
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    decimalNumbers: true,
    multipleStatements: true
});

// Quick connection test
pool.getConnection()
    .then((conn) => {
        console.log(`[Database] Connected successfully to MySQL at ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306} (DB: ${process.env.DB_NAME || 'stayhub_pg'})`);
        conn.release();
    })
    .catch((err) => {
        console.warn(`[Database Warning] MySQL connection failed: ${err.message}`);
        console.warn(`[Database Note] Please ensure MySQL is running and credentials in .env are correct.`);
    });

module.exports = pool;

