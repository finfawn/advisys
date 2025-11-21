try { require('dotenv').config(); } catch (_) {}
const bcrypt = require('bcrypt');
const { getPool } = require('./pool');

async function seedAdminUser() {
  const pool = getPool();

  const email = 'advisys.info@gmail.com';
  const fullName = 'Advisys Admin';
  const plainPassword = 'Admin2025!';
  const role = 'admin';

  try {
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

    if (existingUsers.length > 0) {
      console.log(`Admin user with email ${email} already exists. Skipping creation.`);
    } else {
      const password_hash = await bcrypt.hash(plainPassword, 10);
      const [result] = await pool.query(
        'INSERT INTO users (role, email, password_hash, full_name, status, email_verified, email_verified_at) VALUES (?,?,?,?,?,?,NOW())',
        [role, email, password_hash, fullName, 'active', 1]
      );
      console.log(`Admin user ${fullName} created with ID: ${result.insertId}`);
      console.log(`Email: ${email}`);
      console.log(`Password: ${plainPassword}`);
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    try { await pool.end(); } catch (_) {}
  }
}

seedAdminUser();