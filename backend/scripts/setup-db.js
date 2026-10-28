const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function runSetup() {
    console.log('====================================================');
    console.log('   StayHub PG Management System - Database Setup    ');
    console.log('====================================================\n');

    const host = process.env.DB_HOST || '127.0.0.1';
    const port = parseInt(process.env.DB_PORT, 10) || 3306;
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
    const dbName = process.env.DB_NAME || 'stayhub_pg';

    console.log(`Connecting to MySQL Server at ${host}:${port} as user '${user}'...`);

    let conn;
    try {
        conn = await mysql.createConnection({
            host,
            port,
            user,
            password,
            multipleStatements: true
        });
        console.log('Connection established.\n');
    } catch (err) {
        console.error('Failed to connect to MySQL server:', err.message);
        console.error('\nPlease verify your MySQL server is running and check your .env credentials.');
        process.exit(1);
    }

    const dbDir = path.join(__dirname, '..', '..', 'database');

    // Helper to execute a standard SQL script
    async function executeScript(filename) {
        const filePath = path.join(dbDir, filename);
        console.log(`[Executing] ${filename}...`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await conn.query(sql);
        console.log(`  -> Successfully executed ${filename}`);
    }

    // Helper to execute procedures/triggers with custom delimiter handling
    async function executeProceduresAndTriggers(filename) {
        const filePath = path.join(dbDir, filename);
        console.log(`[Executing] ${filename}...`);
        const content = fs.readFileSync(filePath, 'utf8');

        // Select the database first
        await conn.query(`USE \`${dbName}\`;`);

        // Split text by DELIMITER
        // Lines may have DELIMITER $$ or DELIMITER ;
        const sections = content.split(/DELIMITER\s+\$\$/i);

        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            if (i === 0) {
                // Statements before the first DELIMITER $$
                const stmts = section.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.toLowerCase().startsWith('use '));
                for (const stmt of stmts) {
                    await conn.query(stmt);
                }
            } else {
                // Section contains blocks separated by $$ ending with DELIMITER ;
                const [delimitedBlock, rest] = section.split(/DELIMITER\s+;/i);
                if (delimitedBlock) {
                    const routines = delimitedBlock.split('$$').map(r => r.trim()).filter(r => r.length > 0);
                    for (const routine of routines) {
                        try {
                            await conn.query(routine);
                        } catch (routineErr) {
                            console.warn(`  Warning executing routine block: ${routineErr.message}`);
                        }
                    }
                }
                if (rest) {
                    const stmts = rest.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.toLowerCase().startsWith('use '));
                    for (const stmt of stmts) {
                        await conn.query(stmt);
                    }
                }
            }
        }
        console.log(`  -> Successfully executed ${filename}`);
    }

    try {
        // 1. Schema
        await executeScript('schema.sql');

        // 2. Seed Data
        await executeScript('seed.sql');

        // 3. Views
        await executeScript('views.sql');

        // 4. Procedures, Functions, Triggers & Cursor
        await executeProceduresAndTriggers('procedures_triggers.sql');

        // 5. Indexes
        await executeScript('indexes.sql');

        console.log('\n====================================================');
        console.log('   Database Setup Complete! Database: ' + dbName);
        console.log('   All tables, seed data, views, procs, triggers ready.');
        console.log('====================================================\n');
    } catch (err) {
        console.error('Error during setup execution:', err.message);
    } finally {
        await conn.end();
    }
}

if (require.main === module) {
    runSetup();
}

module.exports = runSetup;

