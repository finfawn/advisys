const { getPool } = require('./pool');
const { run: runAddDepsProgs } = require('./scripts/add_departments_programs');
const { run: runAddConsultationCatalogs } = require('./scripts/add_consultation_catalogs');
const { run: runAlterSubjects } = require('./scripts/alter_advisor_courses_subjects');
const { run: dropAdvisorAutoMax } = require('./scripts/drop_advisor_settings_auto_max');

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
    await runAddConsultationCatalogs();
  } catch (err) {
    console.error('Auto-migrate consultation catalogs failed:', err?.message || err);
  }

  try {
    await runAlterSubjects();
  } catch (err) {
    console.error('Auto-migrate advisor_courses subjects failed:', err?.message || err);
  }

  try {
    await dropAdvisorAutoMax();
  } catch (err) {
    console.error('Auto-migrate drop advisor auto/max failed:', err?.message || err);
  }

  // Seed defaults and backfill FKs for existing profiles
  try {
    await ensureDefaultsAndBackfill();
  } catch (err) {
    console.error('Auto-migrate defaults/backfill failed:', err?.message || err);
  }
}

module.exports = { autoMigrate };

async function ensureDefaultsAndBackfill() {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Seed default department and program if missing
    const [[deptCount]] = await conn.query('SELECT COUNT(1) AS cnt FROM departments');
    if (!deptCount || !deptCount.cnt) {
      await conn.query('INSERT INTO departments (name) VALUES (?)', ['College of Information Technology']);
    }
    const [[progCount]] = await conn.query('SELECT COUNT(1) AS cnt FROM programs');
    if (!progCount || !progCount.cnt) {
      await conn.query('INSERT INTO programs (name) VALUES (?)', ['Bachelor of Science in Information Technology']);
    }

    // Backfill advisor_profiles.department_id based on name
    const [advisors] = await conn.query('SELECT user_id, department, department_id FROM advisor_profiles');
    for (const a of advisors) {
      if (!a.department_id && a.department) {
        const [[d]] = await conn.query('SELECT id FROM departments WHERE name = ? LIMIT 1', [a.department]);
        if (d && d.id) {
          await conn.query('UPDATE advisor_profiles SET department_id = ? WHERE user_id = ?', [d.id, a.user_id]);
        }
      }
    }
    // Backfill student_profiles.program_id based on name
    const [students] = await conn.query('SELECT user_id, program, program_id FROM student_profiles');
    for (const s of students) {
      if (!s.program_id && s.program) {
        const [[p]] = await conn.query('SELECT id FROM programs WHERE name = ? LIMIT 1', [s.program]);
        if (p && p.id) {
          await conn.query('UPDATE student_profiles SET program_id = ? WHERE user_id = ?', [p.id, s.user_id]);
        }
      }
    }
    await conn.commit();
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    throw err;
  } finally {
    conn.release();
  }
}
