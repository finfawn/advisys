const mysql = require('mysql2/promise');
const fs = require('fs');

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = '3306',
  DB_USER = 'root',
  // Support both DB_PASSWORD and DB_PASS; prefer DB_PASSWORD
  DB_PASSWORD = process.env.DB_PASSWORD ?? process.env.DB_PASS ?? '',
  DB_NAME = 'advisys',
  // When running on Cloud Run with a Cloud SQL connection attached,
  // prefer Unix domain socket at /cloudsql/<INSTANCE_CONNECTION_NAME>
  INSTANCE_CONNECTION_NAME = process.env.INSTANCE_CONNECTION_NAME,
  DB_SOCKET_PATH = process.env.DB_SOCKET_PATH || '/cloudsql',
} = process.env;

let pool;

function getPool() {
  if (!pool) {
    // Prefer explicit INSTANCE_CONNECTION_NAME; if missing, try to auto-detect
    let instanceName = INSTANCE_CONNECTION_NAME;
    try {
      if (!instanceName && fs.existsSync(DB_SOCKET_PATH)) {
        const entries = fs.readdirSync(DB_SOCKET_PATH, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);
        if (entries.length === 1) {
          instanceName = entries[0];
        }
      }
    } catch (_) {}

    const useSocket = !!instanceName;
    // Helpful debug for diagnosing connection issues (no secrets logged)
    if (useSocket) {
      console.log('[DB] Creating MySQL pool via Cloud SQL socket', {
        socketPath: `${DB_SOCKET_PATH}/${instanceName}`,
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

    // If INSTANCE_CONNECTION_NAME is set, force socketPath; do not silently
    // fall back to localhost. This makes misconfiguration visible (ENOENT)
    // rather than confusing TCP refusals.
    if (useSocket) {
      pool = mysql.createPool({
        ...baseConfig,
        socketPath: `${DB_SOCKET_PATH}/${instanceName}`,
      });
    } else {
      // Fallback to TCP only when no socket can be determined.
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