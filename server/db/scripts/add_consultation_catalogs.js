const { getPool } = require('../pool');

const DEFAULT_TOPICS = [
  'Thesis / Capstone Guidance',
  'Course Planning and Enrollment',
  'Career Planning and Opportunities',
  'Internship / OJT Support',
  'Academic Performance Concerns',
  'Time Management and Study Skills',
  'Personal Concerns (Academic)',
];

const DEFAULT_SUBJECTS = [
  { code: 'CS101', name: 'Intro to Programming' },
  { code: 'CS102', name: 'Data Structures' },
  { code: 'CS201', name: 'Database Systems' },
  { code: 'IT201', name: 'Networking Basics' },
  { code: 'IT301', name: 'Web Development' },
];

function normalizeTopicName(value) {
  return String(value || '').trim();
}

function normalizeSubjectCode(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function normalizeSubjectName(value) {
  return String(value || '').trim();
}

async function run() {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(`
      CREATE TABLE IF NOT EXISTS consultation_topic_catalog (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_consultation_topic_catalog_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS consultation_subject_catalog (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        subject_code VARCHAR(50) NOT NULL,
        subject_name VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_consultation_subject_catalog_code (subject_code),
        KEY idx_consultation_subject_catalog_name (subject_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [[topicCount]] = await conn.query('SELECT COUNT(1) AS cnt FROM consultation_topic_catalog');
    if (!topicCount || !topicCount.cnt) {
      for (const topic of DEFAULT_TOPICS) {
        const name = normalizeTopicName(topic);
        if (!name) continue;
        await conn.query('INSERT INTO consultation_topic_catalog (name) VALUES (?)', [name]);
      }
    }

    const [[subjectCount]] = await conn.query('SELECT COUNT(1) AS cnt FROM consultation_subject_catalog');
    if (!subjectCount || !subjectCount.cnt) {
      for (const subject of DEFAULT_SUBJECTS) {
        const code = normalizeSubjectCode(subject.code);
        const name = normalizeSubjectName(subject.name);
        if (!code || !name) continue;
        await conn.query(
          'INSERT INTO consultation_subject_catalog (subject_code, subject_name) VALUES (?, ?)',
          [code, name]
        );
      }
    }

    await conn.commit();
    console.log('consultation catalog tables ensured');
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error('Migration add_consultation_catalogs failed', err);
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { run };
