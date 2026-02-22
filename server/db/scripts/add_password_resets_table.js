require('dotenv').config();
const mysql = require('mysql2/promise');

(async function main() {
  const DB_HOST = process.env.DB_HOST || '127.0.0.1';
  const DB_PORT = Number(process.env.DB_PORT || 3306);
  const DB_USER = process.env.DB_USER || 'root';
  const DB_PASSWORD = process.env.DB_PASSWORD || '';
  const DB_NAME = process.env.DB_NAME || 'advisys';
  const enableSsl = String(process.env.DB_ENABLE_SSL || 'false').toLowerCase() === 'true';
  let sslConfig = undefined;
  if (enableSsl) {
    sslConfig = { minVersion: 'TLSv1.2' };
    const reject = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false';
    sslConfig.rejectUnauthorized = reject;
    if (process.env.DB_SSL_CA && process.env.DB_SSL_CA.trim()) {
      sslConfig.ca = process.env.DB_SSL_CA;
    } else if (process.env.DB_SSL_CA_PATH) {
      try {
        const fs = require('fs');
        if (fs.existsSync(process.env.DB_SSL_CA_PATH)) {
          sslConfig.ca = fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf8');
        }
      } catch (_) {}
    }
  }

  let conn;
  try {
    conn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      multipleStatements: true,
      ssl: sslConfig,
    });
    console.log('Connected to MySQL for migration:', DB_NAME);

    const sql = `
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        token_hash VARCHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_password_resets_user (user_id),
        KEY idx_password_resets_token (token_hash),
        CONSTRAINT fk_password_resets_user
          FOREIGN KEY (user_id) REFERENCES users(id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await conn.query(sql);
    console.log('Migration complete: password_resets table ensured.');
  } catch (err) {
    console.error('Migration failed:', err?.message || err);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();
