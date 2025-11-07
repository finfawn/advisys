const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getPool } = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { sendEmail } = require('../services/email');

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
// --- Forgot Password ---
// POST /api/auth/forgot-password
// Body: { email }
router.post('/forgot-password', async (req, res) => {
  const pool = getPool();
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });
  const emailNorm = String(email).trim().toLowerCase();
  try {
    const [[user]] = await pool.query(
      'SELECT id, email, full_name FROM users WHERE email = ? LIMIT 1',
      [emailNorm]
    );
    // Always return success to avoid account enumeration
    if (!user) return res.json({ success: true });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const minutes = Number(process.env.RESET_TOKEN_EXPIRE_MINUTES || 30);
    const expiresAt = new Date(Date.now() + minutes * 60_000);

    await pool.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?,?,?)`,
      [user.id, tokenHash, expiresAt]
    );

    const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    const subject = 'Reset your AdviSys password';
    const html = `
      <p>Hello ${user.full_name || ''},</p>
      <p>You requested to reset your password. Click the link below to set a new password. This link expires in ${minutes} minutes.</p>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>If you didn’t request this, you can ignore this email.</p>
    `;
    try {
      await sendEmail({ to: user.email, subject, html });
    } catch (emailErr) {
      console.warn('Password reset email send error:', emailErr?.message || emailErr);
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Forgot password failed:', err);
    return res.status(500).json({ error: 'Forgot password failed' });
  }
});

// POST /api/auth/reset-password
// Body: { token, newPassword }
router.post('/reset-password', async (req, res) => {
  const pool = getPool();
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and newPassword required' });
  try {
    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
    const [[row]] = await pool.query(
      `SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ? LIMIT 1`,
      [tokenHash]
    );
    if (!row) return res.status(400).json({ error: 'Invalid or expired token' });
    if (row.used_at) return res.status(400).json({ error: 'Token already used' });
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Token expired' });
    }

    const new_hash = await bcrypt.hash(String(newPassword), 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [new_hash, row.user_id]);
    await pool.query('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [row.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('Reset password failed:', err);
    return res.status(500).json({ error: 'Reset password failed' });
  }
});