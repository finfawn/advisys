const mysql = require('mysql2/promise');
const fs = require('fs');

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = process.env.DB_PASSWORD ?? process.env.DB_PASS ?? '',
  DB_NAME = 'advisys',
  INSTANCE_CONNECTION_NAME = process.env.INSTANCE_CONNECTION_NAME,
  DB_SOCKET_PATH = process.env.DB_SOCKET_PATH || '/cloudsql',
  DB_FORCE_TCP = String(process.env.DB_FORCE_TCP || 'false').toLowerCase() === 'true',
} = process.env;

let pool;

function getPool() {
  if (!pool) {
    let instanceName = INSTANCE_CONNECTION_NAME;
    try {
      if (!instanceName && fs.existsSync(DB_SOCKET_PATH)) {
        const entries = fs.readdirSync(DB_SOCKET_PATH, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);
        if (entries.length === 1) instanceName = entries[0];
      }
    } catch (_) {}

    const fullSocketPath = instanceName ? `${DB_SOCKET_PATH}/${instanceName}` : '';
    const socketAvailable = Boolean(!DB_FORCE_TCP && instanceName && fs.existsSync(DB_SOCKET_PATH) && fs.existsSync(fullSocketPath));

    if (socketAvailable) {
      console.log('[DB] Creating MySQL pool via Cloud SQL socket', {
        socketPath: fullSocketPath,
        user: DB_USER,
        database: DB_NAME,
      });
    } else {
      console.log('[DB] Creating MySQL pool', {
        host: DB_HOST,
        port: Number(DB_PORT),
        user: DB_USER,
        database: DB_NAME,
      });
    }

    const baseConfig = {
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };

    if (socketAvailable) {
      pool = mysql.createPool({
        ...baseConfig,
        socketPath: fullSocketPath,
      });
      (async () => {
        try {
          const conn = await pool.getConnection();
          try {
            await conn.query('SELECT 1');
          } finally {
            conn.release();
          }
        } catch (e) {
          const msg = e && (e.code || e.message || String(e));
          if (String(msg).includes('ENOENT') || String(msg).includes('ECONNREFUSED') || String(msg).includes('ETIMEDOUT')) {
            try { await pool.end(); } catch (_) {}
            pool = mysql.createPool({
              ...baseConfig,
              host: DB_HOST,
              port: Number(DB_PORT),
            });
            console.warn('[DB] Cloud SQL socket unavailable; fell back to TCP', { host: DB_HOST, port: Number(DB_PORT) });
          }
        }
      })();
    } else {
      pool = mysql.createPool({
        ...baseConfig,
        host: DB_HOST,
        port: Number(DB_PORT),
      });
    }
  }
  return pool;
}

module.exports = { getPool };