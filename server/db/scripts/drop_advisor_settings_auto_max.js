const { getPool } = require('../pool');

async function run() {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [hasAuto] = await conn.query("SHOW COLUMNS FROM advisor_settings LIKE 'auto_accept_requests'");
    if (hasAuto && hasAuto.length) {
      await conn.query('ALTER TABLE advisor_settings DROP COLUMN auto_accept_requests');
    }
    const [hasMax] = await conn.query("SHOW COLUMNS FROM advisor_settings LIKE 'max_daily_consultations'");
    if (hasMax && hasMax.length) {
      await conn.query('ALTER TABLE advisor_settings DROP COLUMN max_daily_consultations');
    }
    await conn.commit();
    console.log('Dropped deprecated columns from advisor_settings');
  } catch (err) {
    console.error('drop_advisor_settings_auto_max failed:', err);
    try { await conn.rollback(); } catch (_) {}
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };