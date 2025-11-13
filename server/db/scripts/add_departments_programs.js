const { getPool } = require('../pool');

async function run() {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(`CREATE TABLE IF NOT EXISTS departments (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await conn.query(`CREATE TABLE IF NOT EXISTS programs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Add FK columns if missing
    const [apDeptId] = await conn.query('SHOW COLUMNS FROM advisor_profiles LIKE "department_id"');
    if (!apDeptId || !apDeptId.length) {
      await conn.query('ALTER TABLE advisor_profiles ADD COLUMN department_id INT UNSIGNED NULL');
      await conn.query('ALTER TABLE advisor_profiles ADD KEY idx_advisor_department_id (department_id)');
      await conn.query('ALTER TABLE advisor_profiles ADD CONSTRAINT fk_advisor_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL ON UPDATE CASCADE');
    }

    const [spProgId] = await conn.query('SHOW COLUMNS FROM student_profiles LIKE "program_id"');
    if (!spProgId || !spProgId.length) {
      await conn.query('ALTER TABLE student_profiles ADD COLUMN program_id INT UNSIGNED NULL');
      await conn.query('ALTER TABLE student_profiles ADD KEY idx_student_program_id (program_id)');
      await conn.query('ALTER TABLE student_profiles ADD CONSTRAINT fk_student_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL ON UPDATE CASCADE');
    }

    await conn.commit();
    console.log('departments/programs tables ensured');
  } catch (err) {
    console.error('Migration add_departments_programs failed', err);
    try { await conn.rollback(); } catch (_) {}
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };