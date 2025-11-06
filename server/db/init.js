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
      database: DB_NAME,
      multipleStatements: true,
    });
    console.log('Connected. Applying tables to database...', DB_NAME);
    await conn.query(sql);
    // Clean up legacy email verification artifacts if present
    try {
      const [[tbl]] = await conn.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'email_verifications' LIMIT 1`,
        [DB_NAME]
      );
      if (tbl && tbl.TABLE_NAME) {
        console.log('Dropping legacy table: email_verifications');
        await conn.query(`DROP TABLE IF EXISTS email_verifications`);
      }

      const [cols] = await conn.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
        [DB_NAME]
      );
      const names = new Set(cols.map(c => c.COLUMN_NAME));
      const dropCols = [];
      if (names.has('email_verified')) dropCols.push('email_verified');
      if (names.has('email_verified_at')) dropCols.push('email_verified_at');
      if (dropCols.length) {
        console.log('Dropping legacy columns on users:', dropCols.join(', '));
        const alters = dropCols.map(c => `DROP COLUMN ${c}`).join(', ');
        await conn.query(`ALTER TABLE users ${alters}`);
      }
    } catch (e) {
      console.warn('Legacy verification cleanup skipped or failed:', e?.message || e);
    }
    console.log(`Schema applied successfully. Database '${DB_NAME}' ready.`);
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();