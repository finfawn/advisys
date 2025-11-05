require('dotenv').config();
const { getPool } = require('../pool');

async function main() {
  const pool = getPool();
  try {
    console.log('[DB] Dropping deprecated column consultations.meeting_link');
    try {
      await pool.query('ALTER TABLE consultations DROP COLUMN meeting_link');
      console.log('Dropped consultations.meeting_link');
    } catch (err) {
      if (String(err?.code) === 'ER_CANT_DROP_FIELD_OR_KEY' || String(err?.code) === 'ER_BAD_FIELD_ERROR') {
        console.log('Column meeting_link already absent; nothing to do.');
      } else {
        throw err;
      }
    }
  } finally {
    try { await pool.end(); } catch (_) {}
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exitCode = 1;
});