require('dotenv').config();
const mysql = require('mysql2/promise');

(async function main() {
  const DB_HOST = process.env.DB_HOST || '127.0.0.1';
  const DB_PORT = Number(process.env.DB_PORT || 3306);
  const DB_USER = process.env.DB_USER || 'root';
  const DB_PASSWORD = process.env.DB_PASSWORD || '';
  const DB_NAME = process.env.DB_NAME || 'advisys';

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
    console.log('Connected to MySQL for migration:', DB_NAME);

    // Check if column exists
    const [rows] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'advisor_profiles' AND COLUMN_NAME = 'office_location'`,
      [DB_NAME]
    );
    const exists = rows && rows.length > 0;
    if (exists) {
      console.log('Column advisor_profiles.office_location already exists. Skipping.');
    } else {
      console.log('Adding column advisor_profiles.office_location (VARCHAR(255) NULL)...');
      await conn.query(`ALTER TABLE advisor_profiles ADD COLUMN office_location VARCHAR(255) NULL`);
      console.log('Migration complete: office_location added.');
    }
  } catch (err) {
    console.error('Migration failed:', err?.message || err);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();