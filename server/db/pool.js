const mysql = require('mysql2/promise');

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'advisys',
} = process.env;

let pool;

function getPool() {
  if (!pool) {
    // Helpful debug for diagnosing connection issues
    console.log('[DB] Creating MySQL pool', {
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      database: DB_NAME,
    });
    pool = mysql.createPool({
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

module.exports = { getPool };