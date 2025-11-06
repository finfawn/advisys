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
    console.log('Connected to MySQL:', DB_NAME);
    const [rows] = await conn.query(
      `SELECT u.id, u.full_name, ap.department, ap.title, ap.office_location
         FROM users u JOIN advisor_profiles ap ON ap.user_id = u.id
        WHERE u.role = 'advisor'
        ORDER BY u.id ASC`
    );
    if (!rows.length) {
      console.log('No advisor profiles found');
    } else {
      for (const r of rows) {
        console.log(`Advisor ${r.id} | ${r.full_name} | dept=${r.department} | title=${r.title} | office_location=${r.office_location}`);
      }
    }
  } catch (err) {
    console.error('Query failed:', err?.message || err);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();