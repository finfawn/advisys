require('dotenv').config();
const { getPool } = require('../db/pool');

async function main() {
  const pool = getPool();
  const meetingId = process.argv[2] || null;
  const consultationId = process.argv[3] ? Number(process.argv[3]) : null;
  if (!meetingId && !consultationId) {
    console.error('Usage: node server/scripts/dump_transcriptions.js <meetingId> [consultationId]');
    process.exit(1);
  }
  try {
    let sql = 'SELECT id, consultation_id, meeting_id, speaker, text, timestamp FROM transcriptions';
    const where = [];
    const params = [];
    if (meetingId) { where.push('meeting_id = ?'); params.push(meetingId); }
    if (consultationId) { where.push('consultation_id = ?'); params.push(consultationId); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY timestamp ASC, id ASC';
    const [rows] = await pool.query(sql, params);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Dump failed:', err);
    process.exitCode = 1;
  } finally {
    try { await pool.end(); } catch (_) {}
  }
}

main();