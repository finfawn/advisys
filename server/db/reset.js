require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async function main() {
  const DB_HOST = process.env.DB_HOST || '127.0.0.1';
  const DB_PORT = Number(process.env.DB_PORT || 3306);
  const DB_USER = process.env.DB_USER || 'root';
  const DB_PASSWORD = process.env.DB_PASSWORD || '';
  const DB_NAME = process.env.DB_NAME || 'advisys';

  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Connecting to MySQL...', { DB_HOST, DB_PORT, DB_USER });
  let conn;
  try {
    conn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true,
    });
    console.log(`Dropping database '${DB_NAME}' if exists...`);
    await conn.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\`;`);
    console.log(`Creating database '${DB_NAME}'...`);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`);
    console.log(`Selecting database '${DB_NAME}'...`);
    await conn.query(`USE \`${DB_NAME}\`;`);
    console.log('Re-applying schema...');
    await conn.query(sql);
    console.log(`Database '${DB_NAME}' recreated successfully.`);
  } catch (err) {
    console.error('Failed to reset database:', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();
