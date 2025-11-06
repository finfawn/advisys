require('dotenv').config();
const { getPool } = require('../pool');

async function main() {
  const pool = getPool();
  try {
    console.log('[DB] Adding consultations.recording_uri (TEXT NULL) if missing');
    try {
      await pool.query('ALTER TABLE consultations ADD COLUMN recording_uri TEXT NULL');
      console.log('Added recording_uri column.');
    } catch (err) {
      const code = String(err?.code || '');
      if (code === 'ER_DUP_FIELDNAME' || code === 'ER_CANT_DROP_FIELD_OR_KEY' || code === 'ER_BAD_FIELD_ERROR') {
        console.log('recording_uri already exists or not applicable; skipping.');
      } else if (code === 'ER_PARSE_ERROR') {
        // Some MySQL versions support IF NOT EXISTS; try that syntax
        try {
          await pool.query('ALTER TABLE consultations ADD COLUMN IF NOT EXISTS recording_uri TEXT NULL');
          console.log('Added recording_uri column (IF NOT EXISTS).');
        } catch (e2) {
          if (String(e2?.code || '') !== 'ER_DUP_FIELDNAME') throw e2;
        }
      } else {
        throw err;
      }
    }
  } finally {
    try { await pool.end(); } catch (_) {}
  }
}

main().catch(err => {
  console.error('Migration failed:', err?.message || err);
  process.exitCode = 1;
});