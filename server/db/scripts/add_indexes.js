require('dotenv').config();
const { getPool } = require('../pool');

async function addIndex(pool, sql, label) {
  try {
    await pool.query(sql);
    console.log(`[DB] Added index: ${label}`);
  } catch (err) {
    const code = String(err?.code || '');
    if (code === 'ER_DUP_KEYNAME' || code === 'ER_CANT_CREATE_TABLE') {
      console.log(`[DB] Index exists or cannot create: ${label} (${code})`);
    } else if (code === 'ER_TABLE_EXISTS_ERROR') {
      console.log(`[DB] Table exists issue handled for: ${label}`);
    } else {
      console.error(`[DB] Failed to add index ${label}:`, err.message || err);
    }
  }
}

async function main() {
  const pool = getPool();
  try {
    await addIndex(pool, 'ALTER TABLE consultations ADD INDEX idx_room_name (room_name)', 'consultations.idx_room_name');
    await addIndex(pool, 'ALTER TABLE transcriptions ADD INDEX idx_transcriptions_consultation (consultation_id)', 'transcriptions.idx_transcriptions_consultation');
    await addIndex(pool, 'ALTER TABLE transcriptions ADD INDEX idx_transcriptions_meeting (meeting_id)', 'transcriptions.idx_transcriptions_meeting');
  } finally {
    try { await pool.end(); } catch (_) {}
  }
}

main().catch(err => {
  console.error('Add indexes migration failed:', err);
  process.exitCode = 1;
});