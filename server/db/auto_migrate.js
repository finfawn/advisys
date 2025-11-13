const { getPool } = require('./pool');
const { run: runAddDepsProgs } = require('./scripts/add_departments_programs');
const { run: runAlterSubjects } = require('./scripts/alter_advisor_courses_subjects');

async function ensureAdvisorSettingsDuration(conn) {
  try {
    const [cols] = await conn.query('SHOW COLUMNS FROM advisor_settings LIKE "default_consultation_duration"');
    if (!cols || !cols.length) {
      await conn.query('ALTER TABLE advisor_settings ADD COLUMN default_consultation_duration INT UNSIGNED NULL');
    }
  } catch (err) {
    console.warn('ensureAdvisorSettingsDuration warning:', err?.message || err);
  }
}

async function autoMigrate() {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await ensureAdvisorSettingsDuration(conn);
    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error('Auto-migrate core alterations failed:', err?.message || err);
  } finally {
    conn.release();
  }

  try {
    await runAddDepsProgs();
  } catch (err) {
    console.error('Auto-migrate departments/programs failed:', err?.message || err);
  }

  try {
    await runAlterSubjects();
  } catch (err) {
    console.error('Auto-migrate advisor_courses subjects failed:', err?.message || err);
  }
}

module.exports = { autoMigrate };