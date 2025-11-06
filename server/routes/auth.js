const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool } = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Email verification removed entirely: no toggle, always disabled

// Email validation removed: accept provided email as-is (trim + lowercase)

function makeToken(user) {
  const payload = {
    id: user.id,
    role: user.role,
    email: user.email,
    full_name: user.full_name,
  };
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

// POST /api/auth/register
// Body: { role: 'student'|'advisor', firstName, lastName, email, password, program?, department?, yearLevel? }
router.post('/register', async (req, res) => {
  const pool = getPool();
  const { role, firstName, lastName, email, password, program, department, yearLevel } = req.body || {};
  if (!role || !['student','advisor'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (!firstName || !lastName) return res.status(400).json({ error: 'First and last name required' });
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  // Normalize email; email format/domain validation removed
  const emailNorm = String(email).trim().toLowerCase();
  // No email format/domain checks; proceed with registration

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [emailNorm]);
    if (existing.length) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 10);
    const full_name = `${firstName.trim()} ${lastName.trim()}`;

    const [resUser] = await pool.query(
      'INSERT INTO users (role, email, password_hash, full_name, status) VALUES (?,?,?,?,?)',
      [role, emailNorm, password_hash, full_name, 'active']
    );
    const userId = resUser.insertId;

    if (role === 'student') {
      const yr = (yearLevel && String(yearLevel).trim()) || '1';
      await pool.query(
        'INSERT INTO student_profiles (user_id, program, year_level) VALUES (?,?,?)',
        [userId, program || null, yr]
      );
    } else if (role === 'advisor') {
      await pool.query(
        'INSERT INTO advisor_profiles (user_id, title, department, bio, status) VALUES (?,?,?,?,?)',
        [userId, null, department || null, null, 'available']
      );
      await pool.query('INSERT INTO advisor_modes (advisor_user_id, online_enabled, in_person_enabled) VALUES (?,?,?)', [userId, 1, 1]);
    }

    // Email verification removed: issue JWT and return user directly
    const token = makeToken({ id: userId, role, email: emailNorm, full_name });
    return res.json({
      token,
      user: { id: userId, role, email: emailNorm, full_name }
    });
  } catch (err) {
    console.error('Register failed:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
// Body: { email, password }
router.post('/login', async (req, res) => {
  const pool = getPool();
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const emailNorm = String(email).trim().toLowerCase();
    const [rows] = await pool.query('SELECT id, role, email, password_hash, full_name FROM users WHERE email = ?', [emailNorm]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    if (!user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = makeToken(user);
    return res.json({ token, user: { id: user.id, role: user.role, email: user.email, full_name: user.full_name } });
  } catch (err) {
    console.error('Login failed:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Email verification endpoints removed

// POST /api/auth/change-password
// Body: { currentPassword, newPassword }
router.post('/change-password', authMiddleware, async (req, res) => {
  const pool = getPool();
  const userId = req.user?.id;
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both current and new password required' });
  try {
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const { password_hash } = rows[0];
    if (!password_hash) return res.status(400).json({ error: 'No password set' });
    const ok = await bcrypt.compare(currentPassword, password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password incorrect' });
    const new_hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [new_hash, userId]);
    return res.json({ success: true });
  } catch (err) {
    console.error('Change password failed:', err);
    return res.status(500).json({ error: 'Change password failed' });
  }
});

module.exports = router;