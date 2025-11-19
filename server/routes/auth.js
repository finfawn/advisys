const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getPool } = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { sendEmail } = require('../services/email');
let verifyFirebaseIdToken = null;
try { ({ verifyFirebaseIdToken } = require('../services/firebaseAdmin')); } catch (_) {}

const router = express.Router();

const FIREBASE_AUTH_ENABLED = String(process.env.FIREBASE_AUTH_ENABLED || 'false').toLowerCase() === 'true';
const VERIF_TTL_MIN = Number(process.env.VERIFICATION_CODE_TTL_MINUTES || 10);
const VERIF_RESEND_SECONDS = Number(process.env.VERIFICATION_CODE_RESEND_SECONDS || 60);
const VERIF_MAX_PER_HOUR = Number(process.env.VERIFICATION_MAX_PER_HOUR || 5);
const VERIFICATION_DISABLED = String(process.env.EMAIL_VERIFICATION_DISABLED || 'false').toLowerCase() === 'true';
const ACCOUNT_DEACTIVATED_CODE = 'ACCOUNT_DEACTIVATED';
const ACCOUNT_DEACTIVATED_MESSAGE = 'This account has been deactivated. Please contact the administrator for assistance.';

function genCode() {
  const n = Math.floor(Math.random() * 1_000_000);
  return String(n).padStart(6, '0');
}

async function sendVerification(pool, userId, email, full_name) {
  const code = genCode();
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  const expiresAt = new Date(Date.now() + VERIF_TTL_MIN * 60_000);
  await pool.query(
    `INSERT INTO email_verifications (user_id, code_hash, expires_at) VALUES (?,?,?)`,
    [userId, codeHash, expiresAt]
  );
  const subject = 'Verify your AdviSys email';
  const html = `
    <p>Hello ${full_name || ''},</p>
    <p>Your verification code is:</p>
    <p style="font-size:20px; font-weight:bold; letter-spacing:4px;">${code}</p>
    <p>This code expires in ${VERIF_TTL_MIN} minutes.</p>
  `;
  try {
    await sendEmail({ to: email, subject, html });
  } catch (_e) {
    // Keep silent; deliverability issues shouldn't break registration response
  }
}

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

function buildDeactivatedResponse() {
  return {
    error: ACCOUNT_DEACTIVATED_MESSAGE,
    code: ACCOUNT_DEACTIVATED_CODE,
  };
}

function hasEmailVerifiedField(user = {}) {
  return Object.prototype.hasOwnProperty.call(user, 'email_verified');
}

function isEmailVerified(user = {}) {
  if (!hasEmailVerifiedField(user)) return false;
  const val = user.email_verified;
  if (val === null || typeof val === 'undefined') return false;
  return Number(val) === 1;
}

async function shouldBlockForDeactivation(pool, user = {}) {
  if (!user || !user.id) return false;
  const statusLower = String(user.status || '').toLowerCase();
  if (statusLower === 'active') return false;
  let hasDeactivationEvent = false;
  try {
    const [[deact]] = await pool.query(
      'SELECT id FROM user_deactivation_events WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
      [user.id]
    );
    hasDeactivationEvent = Boolean(deact && deact.id);
  } catch (_) {}
  if (hasDeactivationEvent) return true;
  if (VERIFICATION_DISABLED) return true;
  return isEmailVerified(user);
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
      [role, emailNorm, password_hash, full_name, VERIFICATION_DISABLED ? 'active' : 'inactive']
    );
    const userId = resUser.insertId;

    try {
      if (!VERIFICATION_DISABLED) {
        await pool.query('UPDATE users SET email_verified = 0, email_verified_at = NULL WHERE id = ?', [userId]);
      } else {
        await pool.query('UPDATE users SET email_verified = 1, email_verified_at = NOW() WHERE id = ?', [userId]);
      }
    } catch (_e) {
      // If columns don't exist, ignore; we still use status field as fallback
    }

    if (role === 'student') {
      const yr = (yearLevel && String(yearLevel).trim()) || '1';
      await pool.query(
        'INSERT INTO student_profiles (user_id, program, year_level) VALUES (?,?,?)',
        [userId, program || null, yr]
      );
      try {
        const autoOnRegister = String(process.env.AUTO_ENROLL_ON_REGISTER || 'true').toLowerCase() === 'true';
        if (autoOnRegister) {
          const [[t]] = await pool.query(
            `SELECT id FROM academic_terms WHERE is_current = 1 AND CURDATE() BETWEEN start_date AND end_date LIMIT 1`
          );
          if (t && t.id) {
            const [[sp]] = await pool.query('SELECT program, year_level FROM student_profiles WHERE user_id = ? LIMIT 1', [userId]);
            await pool.query(
              `INSERT IGNORE INTO academic_term_memberships (term_id,user_id,role,status_in_term,program_snapshot,year_level_snapshot)
               VALUES (?,?,?,?,?,?)`,
              [t.id, userId, 'student', 'enrolled', sp?.program || null, (sp?.year_level != null ? String(sp.year_level) : null)]
            );
          }
        }
      } catch (e) {
        console.warn('Auto-enroll on register failed:', e?.message || e);
      }
    } else if (role === 'advisor') {
      await pool.query(
        'INSERT INTO advisor_profiles (user_id, title, department, bio, status) VALUES (?,?,?,?,?)',
        [userId, null, department || null, null, 'available']
      );
      await pool.query('INSERT INTO advisor_modes (advisor_user_id, online_enabled, in_person_enabled) VALUES (?,?,?)', [userId, 1, 1]);
    }
    if (process.env.NODE_ENV === 'test' || VERIFICATION_DISABLED) {
      await pool.query('UPDATE users SET status = ? WHERE id = ?', ['active', userId]);
      const token = makeToken({ id: userId, role, email: emailNorm, full_name });
      return res.json({ token, user: { id: userId, role, email: emailNorm, full_name } });
    }
    await sendVerification(pool, userId, emailNorm, full_name);
    return res.json({ pending: true, email: emailNorm });
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
    let rows;
    try {
      [rows] = await pool.query('SELECT id, role, email, password_hash, full_name, status, email_verified FROM users WHERE email = ?', [emailNorm]);
    } catch (_e) {
      [rows] = await pool.query('SELECT id, role, email, password_hash, full_name, status FROM users WHERE email = ?', [emailNorm]);
    }
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    if (!user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    if (await shouldBlockForDeactivation(pool, user)) {
      return res.status(403).json(buildDeactivatedResponse());
    }
    if (!VERIFICATION_DISABLED) {
      const hasEmailVerified = typeof user.email_verified !== 'undefined';
      const notVerified = hasEmailVerified ? Number(user.email_verified) !== 1 : (String(user.status).toLowerCase() !== 'active');
      if (notVerified) {
        return res.status(403).json({ error: 'Email not verified' });
      }
    }
    // Optional auto-enroll at login
    try {
      const autoOnLogin = String(process.env.AUTO_ENROLL_ON_LOGIN || 'false').toLowerCase() === 'true';
      if (autoOnLogin && user.role === 'student') {
        const [[t]] = await pool.query(`SELECT id FROM academic_terms WHERE is_current = 1 AND CURDATE() BETWEEN start_date AND end_date LIMIT 1`);
        if (t && t.id) {
          const [[sp]] = await pool.query('SELECT program, year_level FROM student_profiles WHERE user_id = ? LIMIT 1', [user.id]);
          await pool.query(
            `INSERT IGNORE INTO academic_term_memberships (term_id,user_id,role,status_in_term,program_snapshot,year_level_snapshot)
             VALUES (?,?,?,?,?,?)`,
            [t.id, user.id, 'student', 'enrolled', sp?.program || null, (sp?.year_level != null ? String(sp.year_level) : null)]
          );
        }
      }
    } catch (e) {
      console.warn('Auto-enroll on login failed:', e?.message || e);
    }
    const token = makeToken(user);
    return res.json({ token, user: { id: user.id, role: user.role, email: user.email, full_name: user.full_name } });
  } catch (err) {
    console.error('Login failed:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// --- Email Verification ---
// POST /api/auth/verify/request { email }
router.post('/verify/request', async (req, res) => {
  const pool = getPool();
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const [[user]] = await pool.query('SELECT id, email, full_name, status FROM users WHERE email = ? LIMIT 1', [email]);
    // Always return success to avoid enumeration
    if (!user) return res.json({ success: true });
    if (user.status === 'active') return res.json({ success: true });

    const [[last]] = await pool.query(
      `SELECT id, created_at FROM email_verifications WHERE user_id = ? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1`,
      [user.id]
    );
    if (last) {
      const lastCreated = new Date(last.created_at).getTime();
      if (Date.now() - lastCreated < VERIF_RESEND_SECONDS * 1000) {
        return res.json({ success: true });
      }
    }
    const [[{ cnt }]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM email_verifications WHERE user_id = ? AND created_at >= (NOW() - INTERVAL 1 HOUR)`,
      [user.id]
    );
    if (Number(cnt) >= VERIF_MAX_PER_HOUR) return res.json({ success: true });

    await sendVerification(pool, user.id, user.email, user.full_name);
    return res.json({ success: true });
  } catch (err) {
    console.error('Verify request failed:', err);
    return res.status(200).json({ success: true });
  }
});

// POST /api/auth/verify/confirm { email, code }
router.post('/verify/confirm', async (req, res) => {
  const pool = getPool();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const code = String(req.body?.code || '').trim();
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });
  try {
    const [[user]] = await pool.query('SELECT id, role, email, full_name, status FROM users WHERE email = ? LIMIT 1', [email]);
    if (!user) return res.status(400).json({ error: 'Invalid or expired code' });
    if (user.status === 'active') {
      const token = makeToken(user);
      return res.json({ token, user: { id: user.id, role: user.role, email: user.email, full_name: user.full_name } });
    }
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const [[row]] = await pool.query(
      `SELECT id FROM email_verifications WHERE user_id = ? AND code_hash = ? AND consumed_at IS NULL AND expires_at > NOW() ORDER BY id DESC LIMIT 1`,
      [user.id, codeHash]
    );
    if (!row) return res.status(400).json({ error: 'Invalid or expired code' });
    await pool.query('UPDATE email_verifications SET consumed_at = NOW() WHERE id = ?', [row.id]);
    await pool.query('UPDATE users SET status = ? WHERE id = ?', ['active', user.id]);
    try {
      await pool.query('UPDATE users SET email_verified = 1, email_verified_at = NOW() WHERE id = ?', [user.id]);
    } catch (_e) {}
    const token = makeToken(user);
    return res.json({ token, user: { id: user.id, role: user.role, email: user.email, full_name: user.full_name } });
  } catch (err) {
    console.error('Verify confirm failed:', err);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/auth/firebase-login
// Body: { idToken, role? }
router.post('/firebase-login', async (req, res) => {
  if (!FIREBASE_AUTH_ENABLED) return res.status(404).json({ error: 'Not available' });
  const pool = getPool();
  const idToken = req.body?.idToken;
  let desiredRole = req.body?.role;
  const program = req.body?.program ? String(req.body.program).trim() : null;
  const yearLevel = req.body?.yearLevel ? String(req.body.yearLevel).trim() : null;
  const department = req.body?.department ? String(req.body.department).trim() : null;
  const preventCreate = String(req.body?.preventCreate || 'false').toLowerCase() === 'true';
  try {
    if (!verifyFirebaseIdToken) return res.status(500).json({ error: 'Firebase not configured' });
    if (!idToken) return res.status(400).json({ error: 'idToken required' });
    const decoded = await verifyFirebaseIdToken(idToken);
    const email = String(decoded.email || '').trim().toLowerCase();
    const name = String(decoded.name || decoded.displayName || '').trim() || email;
    if (!email) return res.status(400).json({ error: 'Email missing from token' });
    let rows;
    try {
      [rows] = await pool.query('SELECT id, role, email, full_name, status, email_verified FROM users WHERE email = ? LIMIT 1', [email]);
    } catch (_) {
      [rows] = await pool.query('SELECT id, role, email, full_name, status FROM users WHERE email = ? LIMIT 1', [email]);
    }
    if (rows.length) {
      const user = rows[0];
      if (await shouldBlockForDeactivation(pool, user)) {
        return res.status(403).json(buildDeactivatedResponse());
      }
      if (String(user.status).toLowerCase() !== 'active') {
        await pool.query('UPDATE users SET status = ? WHERE id = ?', ['active', user.id]);
        user.status = 'active';
      }
      try { await pool.query('UPDATE users SET email_verified = 1, email_verified_at = NOW() WHERE id = ?', [user.id]); } catch (_) {}
      const token = makeToken(user);
      return res.json({ token, user: { id: user.id, role: user.role, email: user.email, full_name: user.full_name } });
    }
    if (preventCreate) return res.status(404).json({ error: 'Account not found' });
    if (!['student','advisor'].includes(desiredRole)) desiredRole = 'student';
    const [resUser] = await pool.query(
      'INSERT INTO users (role, email, password_hash, full_name, status) VALUES (?,?,?,?,?)',
      [desiredRole, email, null, name, 'active']
    );
    const userId = resUser.insertId;
    try { await pool.query('UPDATE users SET email_verified = 1, email_verified_at = NOW() WHERE id = ?', [userId]); } catch (_) {}
    if (desiredRole === 'student') {
      const yr = yearLevel && yearLevel.length ? yearLevel : '1';
      await pool.query('INSERT INTO student_profiles (user_id, program, year_level) VALUES (?,?,?)', [userId, program || null, yr]);
    } else {
      await pool.query('INSERT INTO advisor_profiles (user_id, title, department, bio, status) VALUES (?,?,?,?,?)', [userId, null, (department || null), null, 'available']);
      await pool.query('INSERT INTO advisor_modes (advisor_user_id, online_enabled, in_person_enabled) VALUES (?,?,?)', [userId, 1, 1]);
    }
    const token = makeToken({ id: userId, role: desiredRole, email, full_name: name });
    return res.json({ token, user: { id: userId, role: desiredRole, email, full_name: name } });
  } catch (err) {
    return res.status(500).json({ error: 'Firebase login failed' });
  }
});

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