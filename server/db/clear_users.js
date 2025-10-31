require('dotenv').config();
const { getPool } = require('./pool');

async function clearUsers() {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    console.log('Purging users and related tables...');
    await conn.query('SET FOREIGN_KEY_CHECKS=0');
    const tables = [
      'consultation_guidelines',
      'consultations',
      'advisor_availability',
      'advisor_modes',
      'advisor_guidelines',
      'advisor_topics',
      'advisor_courses',
      'advisor_profiles',
      'student_profiles',
      'users',
    ];
    for (const t of tables) {
      console.log(`TRUNCATE TABLE \`${t}\``);
      await conn.query(`TRUNCATE TABLE \`${t}\``);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS=1');
    console.log('Purge complete.');
  } catch (err) {
    console.error('Failed to purge users:', err);
    process.exitCode = 1;
  } finally {
    conn.release();
  }
}

clearUsers();