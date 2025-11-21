require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
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
    // Drop advisor_profiles to resolve legacy foreign key conflicts
    await conn.query(`DROP TABLE IF EXISTS advisor_profiles;`);
    // Drop student_profiles to resolve legacy foreign key conflicts
    await conn.query(`DROP TABLE IF EXISTS student_profiles;`);
    // Drop consultations to resolve duplicate column conflicts
    await conn.query(`DROP TABLE IF EXISTS transcriptions;`);
    await conn.query(`DROP TABLE IF EXISTS consultation_guidelines;`);
    await conn.query(`DROP TABLE IF EXISTS consultations;`);
    await conn.query(sql);

    // Add email_verified and email_verified_at columns to users table if they don't exist
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('email_verified', 'email_verified_at')`,
      [DB_NAME]
    );
    const existingCols = new Set(cols.map(c => c.COLUMN_NAME));

    if (!existingCols.has('email_verified')) {
      console.log('Adding column: users.email_verified');
      await conn.query(`ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER status;`);
    }
    if (!existingCols.has('email_verified_at')) {
      console.log('Adding column: users.email_verified_at');
      await conn.query(`ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL AFTER email_verified;`);
    }

    console.log(`Schema applied successfully. Database '${DB_NAME}' ready.`);
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();