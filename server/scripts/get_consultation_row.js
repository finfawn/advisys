require('dotenv').config();
const { getPool } = require('../db/pool');

async function main() {
  const id = parseInt(process.argv[2], 10);
  if (!id) { console.error('Usage: node get_consultation_row.js <id>'); process.exit(1); }
  const pool = getPool();
  try {
    const [rows] = await pool.query('SELECT id, ai_summary, final_transcript FROM consultations WHERE id = ?', [id]);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('Query failed:', err);
    process.exitCode = 1;
  } finally {
    try { await pool.end(); } catch (_) {}
  }
}

main();