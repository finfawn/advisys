require('dotenv').config();
const { getPool } = require('../pool');

async function main() {
  const pool = getPool();
  try {
    console.log('[DB] Altering consultations: add final_transcript, ai_summary');
    await pool.query('ALTER TABLE consultations ADD COLUMN IF NOT EXISTS final_transcript LONGTEXT NULL');
    await pool.query('ALTER TABLE consultations ADD COLUMN IF NOT EXISTS ai_summary LONGTEXT NULL');
    console.log('Done.');
  } catch (err) {
    if (err && err.code === 'ER_PARSE_ERROR') {
      // Fallback for MySQL versions without IF NOT EXISTS
      try {
        await pool.query('ALTER TABLE consultations ADD COLUMN final_transcript LONGTEXT NULL');
      } catch (e1) {
        if (e1 && e1.code !== 'ER_DUP_FIELDNAME') throw e1;
      }
      try {
        await pool.query('ALTER TABLE consultations ADD COLUMN ai_summary LONGTEXT NULL');
      } catch (e2) {
        if (e2 && e2.code !== 'ER_DUP_FIELDNAME') throw e2;
      }
      console.log('Done (fallback path).');
    } else {
      throw err;
    }
  } finally {
    try { await pool.end(); } catch (_) {}
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exitCode = 1;
});