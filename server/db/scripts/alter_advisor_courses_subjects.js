const { getPool } = require('../pool');

async function run() {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Ensure columns exist
    const [cols] = await conn.query('SHOW COLUMNS FROM advisor_courses LIKE "subject_code"');
    if (!cols || !cols.length) {
      await conn.query('ALTER TABLE advisor_courses ADD COLUMN subject_code VARCHAR(50) NULL');
    }
    const [cols2] = await conn.query('SHOW COLUMNS FROM advisor_courses LIKE "subject_name"');
    if (!cols2 || !cols2.length) {
      await conn.query('ALTER TABLE advisor_courses ADD COLUMN subject_name VARCHAR(255) NULL');
    }

    // Normalize lengths and NOT NULL with safe defaults
    await conn.query('UPDATE advisor_courses SET subject_code = IFNULL(subject_code, "")');
    await conn.query('UPDATE advisor_courses SET subject_name = IFNULL(subject_name, course_name)');
    await conn.query('ALTER TABLE advisor_courses MODIFY COLUMN subject_code VARCHAR(50) NOT NULL');
    await conn.query('ALTER TABLE advisor_courses MODIFY COLUMN subject_name VARCHAR(255) NOT NULL');

    // Indexes: create only if missing
    const [idx1] = await conn.query('SHOW INDEX FROM advisor_courses WHERE Key_name = "idx_courses_subject_code"');
    if (!idx1 || !idx1.length) {
      await conn.query('CREATE INDEX idx_courses_subject_code ON advisor_courses (subject_code)');
    }
    const [idx2] = await conn.query('SHOW INDEX FROM advisor_courses WHERE Key_name = "idx_courses_subject_name"');
    if (!idx2 || !idx2.length) {
      await conn.query('CREATE INDEX idx_courses_subject_name ON advisor_courses (subject_name)');
    }

    await conn.commit();
    console.log('advisor_courses subject columns updated');
  } catch (err) {
    console.error('Migration alter_advisor_courses_subjects failed', err);
    try { await conn.rollback(); } catch (_) {}
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };