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

    const sql = `
      CREATE TABLE IF NOT EXISTS email_verifications (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        code_hash VARCHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        consumed_at DATETIME NULL,
        resend_count INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_email_verif_user (user_id),
        KEY idx_email_verif_expires (expires_at),
        CONSTRAINT fk_email_verif_user
          FOREIGN KEY (user_id) REFERENCES users(id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await conn.query(sql);
    console.log('Migration complete: email_verifications table ensured.');
  } catch (err) {
    console.error('Migration failed:', err?.message || err);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();