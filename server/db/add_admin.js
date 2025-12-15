require('dotenv').config();
const bcrypt = require('bcrypt');
const { getPool } = require('../db/pool');

async function ensureAdmin() {
  const pool = getPool();
  const email = process.env.ADMIN_EMAIL || 'admin@advisys.local';
  const fullName = process.env.ADMIN_FULL_NAME || 'System Admin';
  const plainPassword = process.env.ADMIN_PASSWORD || 'Admin!2025-ChangeMe';
  try {
    const [rows] = await pool.query('SELECT id, role FROM users WHERE email = ? LIMIT 1', [email]);
    if (rows.length) {
      const u = rows[0];
      // If exists, set role to admin and reset password
      const hash = await bcrypt.hash(plainPassword, 10);
      await pool.query('UPDATE users SET role = ?, password_hash = ?, full_name = ?, status = ? WHERE id = ?', [
        'admin',
        hash,
        fullName,
        'active',
        u.id,
      ]);
      console.log(`[admin] Updated existing user to admin: ${email}`);
    } else {
      const hash = await bcrypt.hash(plainPassword, 10);
      const [resUser] = await pool.query(
        'INSERT INTO users (role, email, password_hash, full_name, status) VALUES (?,?,?,?,?)',
        ['admin', email, hash, fullName, 'active']
      );
      console.log(`[admin] Created admin user: ${email} (id=${resUser.insertId})`);
    }
    console.log(`[admin] Initial password: ${plainPassword}`);
    console.log('[admin] Please change this password after first login.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to ensure admin user:', err);
    process.exit(1);
  }
}

ensureAdmin();
