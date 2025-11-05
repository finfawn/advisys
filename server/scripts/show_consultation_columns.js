require('dotenv').config();
const { getPool } = require('../db/pool');

async function main() {
  const pool = getPool();
  try {
    const [rows] = await pool.query('SHOW COLUMNS FROM consultations');
    console.log(rows.map(r => r.Field).join(', '));
  } catch (err) {
    console.error('SHOW COLUMNS failed:', err);
    process.exitCode = 1;
  } finally {
    try { await pool.end(); } catch (_) {}
  }
}

main();