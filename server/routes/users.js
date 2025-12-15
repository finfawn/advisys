const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const { getPool } = require('../db/pool');
const crypto = require('crypto');
const { sendEmail } = require('../services/email');

function formatYear(yearLevel) {
  const n = Number(yearLevel);
  if (!n || n < 1) return '1st Year';
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${suffix} Year`;
}

const _invalidPlaceholders = new Set(['-', '--', '---', 'n/a', 'na', 'none', 'null', 'undefined']);
function _isValidName(s) {
  const t = String(s || '').trim();
  if (!t || _invalidPlaceholders.has(t.toLowerCase())) return false;
  if (!/^[A-Za-z\s.'-]+$/.test(t)) return false;
  const letters = (t.match(/[A-Za-z]/g) || []).length;
  if (letters < 2) return false;
  if (t.length > 100) return false;
  return true;
}
function _isValidEmail(s) {
  const t = String(s || '').trim().toLowerCase();
  if (!t || _invalidPlaceholders.has(t)) return false;
  if (t.length > 255) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}
function _cleanOptionalText(s, maxLen = 255) {
  const t = String(s || '').trim();
  if (!t || _invalidPlaceholders.has(t.toLowerCase())) return null;
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}
function _isValidPassword(s) {
  const t = String(s || '').trim();
  if (t.length < 6) return false;
  if (t.length > 255) return false;
  return true;
}
function _normalizeYearLevel(input) {
  const raw = String(input || '').trim();
  if (!raw) return 1;
  const parsed = parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 10) return parsed;
  if (raw.includes('1')) return 1;
  if (raw.includes('2')) return 2;
  if (raw.includes('3')) return 3;
  if (raw.includes('4')) return 4;
  return 1;
}

let ensureDeactivateTableLock = null;
async function ensureUserDeactivationEvents(pool) {
  if (ensureDeactivateTableLock) return ensureDeactivateTableLock;
  ensureDeactivateTableLock = (async () => {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS user_deactivation_events (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        term_id INT UNSIGNED NULL,
        reason ENUM('graduated','dropped','other') NOT NULL,
        other_reason VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_user (user_id),
        KEY idx_term (term_id),
        CONSTRAINT fk_deact_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_deact_term FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    } catch (e) {
      try {
        await pool.query(`CREATE TABLE IF NOT EXISTS user_deactivation_events (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id INT UNSIGNED NOT NULL,
          term_id INT UNSIGNED NULL,
          reason ENUM('graduated','dropped','other') NOT NULL,
          other_reason VARCHAR(255) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_user (user_id),
          KEY idx_term (term_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      } catch (_) {}
    }
  })().finally(()=>{ ensureDeactivateTableLock = null; });
  return ensureDeactivateTableLock;
}

// GET /api/users
// Optional query params:
// - role=student|advisor (filter by role)
router.get('/', async (req, res) => {
  const pool = getPool();
  const { role } = req.query;
  try {
    // Ensure audit table exists before queries that reference it
    await ensureUserDeactivationEvents(pool);
    if (role === 'admin') {
      const [rows] = await pool.query(
        `SELECT u.id, u.full_name AS name, u.email, u.role, u.status, u.password_changed_at
         FROM users u
         WHERE LOWER(u.role) IN ('admin','administrator','superadmin')
         ORDER BY u.id ASC`
      );
      const data = rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: 'admin',
        active: r.status === 'active',
        passwordChangedAt: r.password_changed_at || null,
      }));
      return res.json(data);
    }
    if (role === 'student') {
      const [rows] = await pool.query(
        `SELECT u.id, u.full_name AS name, u.email, u.role, u.status, u.password_changed_at,
                sp.program, sp.year_level, sp.avatar_url,
                (
                  SELECT e.reason
                  FROM user_deactivation_events e
                  WHERE e.user_id = u.id
                  ORDER BY e.created_at DESC, e.id DESC
                  LIMIT 1
                ) AS last_reason,
                (
                  SELECT e.other_reason
                  FROM user_deactivation_events e
                  WHERE e.user_id = u.id
                  ORDER BY e.created_at DESC, e.id DESC
                  LIMIT 1
                ) AS last_other
         FROM users u
         JOIN student_profiles sp ON sp.user_id = u.id
         WHERE u.role = 'student'
         ORDER BY u.id ASC`
      );
      const data = rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: 'student',
        active: r.status === 'active',
        program: r.program || null,
        year: formatYear(r.year_level || 1),
        avatar_url: r.avatar_url || null,
        deactivationReason: r.last_reason || null,
        deactivationOther: r.last_other || null,
        passwordChangedAt: r.password_changed_at || null,
      }));
      return res.json(data);
    }

    if (role === 'advisor') {
      const [rows] = await pool.query(
        `SELECT u.id, u.full_name AS name, u.email, u.role, u.status, u.password_changed_at,
                ap.department, ap.title, ap.avatar_url,
                (
                  SELECT e.reason
                  FROM user_deactivation_events e
                  WHERE e.user_id = u.id
                  ORDER BY e.created_at DESC, e.id DESC
                  LIMIT 1
                ) AS last_reason,
                (
                  SELECT e.other_reason
                  FROM user_deactivation_events e
                  WHERE e.user_id = u.id
                  ORDER BY e.created_at DESC, e.id DESC
                  LIMIT 1
                ) AS last_other
         FROM users u
         JOIN advisor_profiles ap ON ap.user_id = u.id
         WHERE u.role = 'advisor'
         ORDER BY u.id ASC`
      );
      const data = rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: 'advisor',
        active: r.status === 'active',
        department: r.department || null,
        title: r.title || null,
        avatar_url: r.avatar_url || null,
        deactivationReason: r.last_reason || null,
        deactivationOther: r.last_other || null,
        passwordChangedAt: r.password_changed_at || null,
      }));
      return res.json(data);
    }

    // Return both students and advisors if no role filter
    const [studentRows] = await pool.query(
      `SELECT u.id, u.full_name AS name, u.email, u.role, u.status, u.password_changed_at,
              sp.program, sp.year_level, sp.avatar_url,
              (
                SELECT e.reason
                FROM user_deactivation_events e
                WHERE e.user_id = u.id
                ORDER BY e.created_at DESC, e.id DESC
                LIMIT 1
              ) AS last_reason,
              (
                SELECT e.other_reason
                FROM user_deactivation_events e
                WHERE e.user_id = u.id
                ORDER BY e.created_at DESC, e.id DESC
                LIMIT 1
              ) AS last_other
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE u.role = 'student'
       ORDER BY u.id ASC`
    );
    const [advisorRows] = await pool.query(
      `SELECT u.id, u.full_name AS name, u.email, u.role, u.status, u.password_changed_at,
              ap.department, ap.title, ap.avatar_url
       FROM users u
       LEFT JOIN advisor_profiles ap ON ap.user_id = u.id
       WHERE u.role = 'advisor'
       ORDER BY u.id ASC`
    );

    const students = studentRows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: 'student',
      active: r.status === 'active',
      program: r.program || null,
      year: formatYear(r.year_level || 1),
      avatar_url: r.avatar_url || null,
      deactivationReason: r.last_reason || null,
      deactivationOther: r.last_other || null,
      passwordChangedAt: r.password_changed_at || null,
    }));
    const advisors = advisorRows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: 'advisor',
      active: r.status === 'active',
      department: r.department || null,
      title: r.title || null,
      avatar_url: r.avatar_url || null,
      passwordChangedAt: r.password_changed_at || null,
    }));

    res.json({ students, advisors });
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// General profile update
// PATCH /api/users/:id
// Accepts base fields in users plus role-specific profile fields
router.patch('/:id', async (req, res) => {
  const pool = getPool();
  const userId = req.params.id;
  const {
    full_name,
    email,
    role,
    status,
    password,
    program,
    year_level,
    department,
    title,
    avatar_url,
  } = req.body || {};

  try {
    // Ensure user exists
    const [rows] = await pool.query('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const existingRole = rows[0].role;
    const roleToUse = role || existingRole;

    // Update users table
  const fields = [];
  const values = [];
  if (typeof full_name === 'string') {
    const nameNorm = String(full_name).replace(/\s+/g,' ').trim();
    if (!_isValidName(nameNorm)) { return res.status(400).json({ error: 'Invalid full_name' }); }
    fields.push('full_name = ?'); values.push(nameNorm);
  }
  if (typeof email === 'string') {
    const emailNorm = String(email).trim().toLowerCase();
    if (!_isValidEmail(emailNorm)) { return res.status(400).json({ error: 'Invalid email' }); }
    fields.push('email = ?'); values.push(emailNorm);
  }
    if (typeof status === 'string') { fields.push('status = ?'); values.push(status === 'active' ? 'active' : 'inactive'); }
    if (typeof password === 'string' && password.length > 0) {
      if (!_isValidPassword(password)) {
        return res.status(400).json({ error: 'Invalid password' });
      }
      const hashed = await bcrypt.hash(password, 10);
      fields.push('password_hash = ?');
      values.push(hashed);
      fields.push('password_changed_at = NOW()');
    }
    if (fields.length) {
      values.push(userId);
      await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    // Role-specific tables
    if (roleToUse === 'student') {
      const sFields = [];
      const sValues = [];
      if (typeof program === 'string') { sFields.push('program = ?'); sValues.push(_cleanOptionalText(program)); }
      if (typeof year_level !== 'undefined') { sFields.push('year_level = ?'); sValues.push(_normalizeYearLevel(year_level)); }
      if (typeof avatar_url !== 'undefined') { sFields.push('avatar_url = ?'); sValues.push(avatar_url || null); }
      if (sFields.length) {
        sValues.push(userId);
        await pool.query(`UPDATE student_profiles SET ${sFields.join(', ')} WHERE user_id = ?`, sValues);
      }
    }
    if (roleToUse === 'advisor') {
      const aFields = [];
      const aValues = [];
      if (typeof department === 'string') { aFields.push('department = ?'); aValues.push(_cleanOptionalText(department)); }
      if (typeof title === 'string') { aFields.push('title = ?'); aValues.push(_cleanOptionalText(title)); }
      if (typeof avatar_url !== 'undefined') { aFields.push('avatar_url = ?'); aValues.push(avatar_url || null); }
      if (aFields.length) {
        aValues.push(userId);
        await pool.query(`UPDATE advisor_profiles SET ${aFields.join(', ')} WHERE user_id = ?`, aValues);
      }
    }

    res.json({ id: Number(userId), success: true });
  } catch (err) {
    console.error('Failed to update user:', err);
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already in use by another account' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Permanently delete a user (expects user to be inactive)
// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  const pool = getPool();
  const userId = req.params.id;
  try {
    const [rows] = await pool.query('SELECT status FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    if (rows[0].status !== 'inactive') {
      return res.status(400).json({ error: 'User must be inactive before deletion' });
    }

    // Delete from dependent tables first to be safe
    try { await pool.query('DELETE FROM student_profiles WHERE user_id = ?', [userId]); } catch (_) {}
    try { await pool.query('DELETE FROM advisor_profiles WHERE user_id = ?', [userId]); } catch (_) {}
    try { await pool.query('DELETE FROM consultations WHERE student_user_id = ? OR advisor_user_id = ?', [userId, userId]); } catch (_) {}
    try { await pool.query('DELETE FROM notifications WHERE user_id = ?', [userId]); } catch (_) {}

    // Now delete the user
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ id: Number(userId), success: true });
  } catch (err) {
    console.error('Failed to delete user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Create a single user (admin only)
// POST /api/users
router.post('/', authMiddleware, async (req, res) => {
  const pool = getPool();
  const actor = req.user || {};
  if (String(actor.role) !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const {
    role,
    firstName,
    lastName,
    email,
    program,
    year,
    yearLevel,
    year_level,
    department,
    title,
  } = req.body || {};
  const sysRole = (String(role || '').toLowerCase() === 'advisor') ? 'advisor' : 'student';
  const first = String(firstName || '').trim();
  const last = String(lastName || '').trim();
  const emailNorm = String(email || '').trim().toLowerCase();
  if (!_isValidName(first)) {
    return res.status(400).json({ error: 'Invalid firstName' });
  }
  if (!_isValidName(last)) {
    return res.status(400).json({ error: 'Invalid lastName' });
  }
  if (!_isValidEmail(emailNorm)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  const genTempPassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const bytes = crypto.randomBytes(12);
    let out = '';
    for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
    return out;
  };
  const APP_BASE_URL = (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query('SELECT id FROM users WHERE email = ? LIMIT 1', [emailNorm]);
    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({ error: 'Email already registered' });
    }
    const temp = genTempPassword();
    const hash = await bcrypt.hash(temp, 10);
    const full_name = `${first} ${last}`.replace(/\s+/g,' ').trim();
    const [resUser] = await conn.query(
      'INSERT INTO users (role, email, password_hash, full_name, status) VALUES (?,?,?,?,?)',
      [sysRole, emailNorm, hash, full_name, 'active']
    );
    const userId = resUser.insertId;
    try {
      await conn.query('UPDATE users SET email_verified = 1, email_verified_at = NOW(), must_change_password = 1 WHERE id = ?', [userId]);
    } catch (_) {
      try {
        await conn.query('UPDATE users SET email_verified = 1, email_verified_at = NOW() WHERE id = ?', [userId]);
      } catch (_) {}
    }
    if (sysRole === 'student') {
      const yrLevel = _normalizeYearLevel(year || yearLevel || year_level);
      const programClean = _cleanOptionalText(program);
      await conn.query('INSERT INTO student_profiles (user_id, program, year_level) VALUES (?,?,?)', [userId, programClean, yrLevel]);
      try {
        const [[t]] = await conn.query('SELECT id FROM academic_terms WHERE is_current = 1 LIMIT 1');
        if (t && t.id) {
          await conn.query(
            `INSERT IGNORE INTO academic_term_memberships (term_id,user_id,role,status_in_term,program_snapshot,year_level_snapshot)
             VALUES (?,?,?,?,?,?)`,
            [t.id, userId, 'student', 'enrolled', program || null, String(yrLevel)]
          );
        }
      } catch (_) {}
    } else {
      const titleClean = _cleanOptionalText(title);
      const deptClean = _cleanOptionalText(department);
      await conn.query('INSERT INTO advisor_profiles (user_id, title, department, bio, status) VALUES (?,?,?,?,?)', [userId, titleClean, deptClean, null, 'available']);
      try {
        await conn.query('INSERT IGNORE INTO advisor_modes (advisor_user_id, online_enabled, in_person_enabled) VALUES (?,?,?)', [userId, 1, 1]);
      } catch (_) {}
    }
    await conn.commit();

    const subject = 'Your AdviSys account credentials';
    const loginUrl = `${APP_BASE_URL}/login`;
    const html = `
      <p>Hello ${full_name},</p>
      <p>Your account has been created on AdviSys.</p>
      <p><strong>Email:</strong> ${emailNorm}<br/><strong>Password:</strong> ${temp}</p>
      <p>Sign in at <a href="${loginUrl}">${loginUrl}</a> and make sure to change this password after logging in.</p>
    `;
    try { await sendEmail({ to: emailNorm, subject, html }); } catch (_) {}

    return res.json({ id: userId, role: sysRole, email: emailNorm, full_name });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error('Create user failed:', err);
    const message = err?.message || String(err);
    const code = err?.code || undefined;
    return res.status(500).json({ error: 'Create user failed', reason: message, code });
  } finally {
    try { conn.release(); } catch (_) {}
  }
});

// Create an admin user
// POST /api/users/admin
// Body: { firstName, lastName, email, password }
router.post('/admin', authMiddleware, async (req, res) => {
  const pool = getPool();
  const actor = req.user || {};
  if (String(actor.role) !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { firstName, lastName, email, password } = req.body || {};
  if (!_isValidName(firstName) || !_isValidName(lastName) || !_isValidEmail(email) || !_isValidPassword(password)) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  try {
    const emailNorm = String(email).trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [emailNorm]);
    if (existing.length) return res.status(409).json({ error: 'Email already registered' });
    const password_hash = await bcrypt.hash(String(password), 10);
    const full_name = `${String(firstName).trim()} ${String(lastName).trim()}`.replace(/\s+/g,' ').trim();
    const [resUser] = await pool.query(
      'INSERT INTO users (role, email, password_hash, full_name, status) VALUES (?,?,?,?,?)',
      ['admin', emailNorm, password_hash, full_name, 'active']
    );
    const userId = resUser.insertId;
    return res.json({ id: userId, role: 'admin', email: emailNorm, full_name });
  } catch (err) {
    console.error('Create admin failed:', err);
    return res.status(500).json({ error: 'Create admin failed' });
  }
});

module.exports = router;

// Update user status (activate/deactivate)
// PATCH /api/users/:id/status { active: boolean } or { status: 'active'|'inactive' }
router.patch('/:id/status', async (req, res) => {
  const pool = getPool();
  const userId = req.params.id;
  try {
    await ensureUserDeactivationEvents(pool);
    const { active, status, reason, otherReason, termId } = req.body || {};
    let newStatus = status;
    if (!newStatus) {
      if (typeof active === 'boolean') newStatus = active ? 'active' : 'inactive';
    }
    if (newStatus !== 'active' && newStatus !== 'inactive') {
      return res.status(400).json({ error: "Invalid status. Use 'active' or 'inactive'." });
    }

    // Update main users table
    const [result] = await pool.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Also update advisor_profiles status if present (no-op for non-advisors)
    const advisorProfileStatus = newStatus === 'active' ? 'available' : 'unavailable';
    await pool.query('UPDATE advisor_profiles SET status = ? WHERE user_id = ?', [advisorProfileStatus, userId]);

    // Check if user is a student
    const [[userCheck]] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
    const isStudent = userCheck && String(userCheck.role).toLowerCase() === 'student';

    // If student is being activated, ensure term memberships reflect 'enrolled'
    if (newStatus === 'active' && isStudent) {
      await pool.query(
        `UPDATE academic_term_memberships
         SET status_in_term = 'enrolled'
         WHERE user_id = ? AND role = 'student' AND status_in_term IN ('dropped','graduated')`,
        [userId]
      );
    }

    // Record deactivation event with optional term context
    if (newStatus === 'inactive' && reason) {
      await pool.query(
        `INSERT INTO user_deactivation_events (user_id, term_id, reason, other_reason)
         VALUES (?,?,?,?)`,
        [userId, termId || null, ['graduated','dropped'].includes(String(reason)) ? String(reason) : 'other', otherReason || null]
      );
      
      // If student is being deactivated, update enrollment status in all terms
      if (isStudent) {
        const deactivationStatus = (reason === 'graduated' || reason === 'dropped') ? String(reason) : 'dropped';
        
        // Update enrollment status in all terms where student is enrolled
        await pool.query(
          `UPDATE academic_term_memberships
           SET status_in_term = ?
           WHERE user_id = ? AND role = 'student' AND status_in_term = 'enrolled'`,
          [deactivationStatus, userId]
        );
        
        // If specific term provided, also archive consultations for that term
        if (termId && (reason === 'graduated' || reason === 'dropped')) {
          await pool.query(
            `UPDATE consultations
             SET archived_at = IFNULL(archived_at, NOW()), archive_reason = ?
             WHERE student_user_id = ? AND academic_term_id = ? AND status IN ('pending','approved')`,
            [String(reason), userId, Number(termId)]
          );
        }
      }
    } else if (newStatus === 'inactive' && isStudent) {
      // Deactivated without specific reason - still unenroll from all terms
      await pool.query(
        `UPDATE academic_term_memberships
         SET status_in_term = 'dropped'
         WHERE user_id = ? AND role = 'student' AND status_in_term = 'enrolled'`,
        [userId]
      );
    }

    res.json({ id: Number(userId), status: newStatus });
  } catch (err) {
    console.error('Failed to update user status:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Bulk create users (admin only)
// POST /api/users/bulk-create
// Body:
// { role: 'students'|'advisors', rows: [ { firstName, lastName, email, ... } ] }
router.post('/bulk-create', authMiddleware, async (req, res) => {
  const pool = getPool();
  const actor = req.user || {};
  if (String(actor.role) !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { role, rows } = req.body || {};
  const roleKey = String(role || '').toLowerCase();
  if (!['students','advisors'].includes(roleKey)) {
    return res.status(400).json({ error: "role must be 'students' or 'advisors'" });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'rows array required' });
  }
  const genTempPassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const bytes = crypto.randomBytes(12);
    let out = '';
    for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
    return out;
  };
  const APP_BASE_URL = (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
  const created = [];
  const failed = [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const r of rows) {
      try {
        const firstRaw = String(r.firstName || r.first_name || '').trim();
        const lastRaw = String(r.lastName || r.last_name || '').trim();
        const email = String(r.email || '').trim().toLowerCase();
        if (!_isValidName(firstRaw)) { failed.push({ email, error: 'Invalid firstName' }); continue; }
        if (!_isValidName(lastRaw)) { failed.push({ email, error: 'Invalid lastName' }); continue; }
        if (!_isValidEmail(email)) { failed.push({ email, error: 'Invalid email' }); continue; }
        const [existing] = await conn.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
        if (existing.length) { failed.push({ email, error: 'Email exists' }); continue; }
        const temp = genTempPassword();
        const hash = await bcrypt.hash(temp, 10);
        const full_name = `${firstRaw} ${lastRaw}`.replace(/\s+/g,' ').trim();
        const sysRole = roleKey === 'students' ? 'student' : 'advisor';
        const [resUser] = await conn.query(
          'INSERT INTO users (role, email, password_hash, full_name, status) VALUES (?,?,?,?,?)',
          [sysRole, email, hash, full_name, 'active']
        );
        const userId = resUser.insertId;
        try {
          await conn.query('UPDATE users SET email_verified = 1, email_verified_at = NOW(), must_change_password = 1 WHERE id = ?', [userId]);
        } catch (_) {
          try {
            await conn.query('UPDATE users SET email_verified = 1, email_verified_at = NOW() WHERE id = ?', [userId]);
          } catch (_) {}
        }
        if (sysRole === 'student') {
          const program = _cleanOptionalText(r.program || r.Program || null);
          const yearLevel = _normalizeYearLevel(r.year || r.Year || '');
          await conn.query('INSERT INTO student_profiles (user_id, program, year_level) VALUES (?,?,?)', [userId, program || null, yearLevel]);
          try {
            const [[t]] = await conn.query('SELECT id FROM academic_terms WHERE is_current = 1 LIMIT 1');
            if (t && t.id) {
              await conn.query(
                `INSERT IGNORE INTO academic_term_memberships (term_id,user_id,role,status_in_term,program_snapshot,year_level_snapshot)
                 VALUES (?,?,?,?,?,?)`,
                [t.id, userId, 'student', 'enrolled', program || null, String(yearLevel)]
              );
            }
          } catch (_) {}
        } else {
          const department = _cleanOptionalText(r.department || r.Department || null);
          const title = _cleanOptionalText(r.title || r.Title || null);
          const bioRaw = r.bio || r.Bio || null;
          const bioClean = _cleanOptionalText(bioRaw, 2000);
          await conn.query('INSERT INTO advisor_profiles (user_id, title, department, bio, status) VALUES (?,?,?,?,?)', [userId, title || null, department || null, bioClean || null, 'available']);
          try {
            const onlineEnabled = String(r.online || r.Online || 'true').toLowerCase() === 'true' ? 1 : 0;
            const inPersonEnabled = String(r.inPerson || r.InPerson || 'true').toLowerCase() === 'true' ? 1 : 0;
            await conn.query('INSERT IGNORE INTO advisor_modes (advisor_user_id, online_enabled, in_person_enabled) VALUES (?,?,?)', [userId, onlineEnabled, inPersonEnabled]);
          } catch (_) {}
          try {
            const subjects = r.subjects || r.Subjects || '';
            const list = String(subjects)
              .split(';')
              .map(s => s.trim())
              .filter(Boolean)
              .map(pair => {
                const [code = '', name = ''] = pair.split('|');
                return { code: code.trim(), name: name.trim() };
              })
              .filter(x => x.code && x.name);
            for (const s of list) {
              await conn.query(
                'INSERT INTO advisor_courses (advisor_user_id, course_name, subject_code, subject_name) VALUES (?,?,?,?)',
                [userId, s.name || s.code, s.code, s.name]
              );
            }
          } catch (_) {}
          // Optional categories -> advisor_topics
          try {
            const categories = r.categories || r.Categories || '';
            const topics = String(categories).split(';').map(s=>s.trim()).filter(Boolean);
            for (const topic of topics) {
              const v = _cleanOptionalText(topic);
              if (v) {
                await conn.query('INSERT INTO advisor_topics (advisor_user_id, topic) VALUES (?, ?)', [userId, v]);
              }
            }
          } catch (_) {}
          // Optional guidelines -> advisor_guidelines
          try {
            const guidelines = r.guidelines || r.Guidelines || '';
            const gl = String(guidelines).split(';').map(s=>s.trim()).filter(Boolean);
            for (const g of gl) {
              const v = _cleanOptionalText(g);
              if (v) {
                await conn.query('INSERT INTO advisor_guidelines (advisor_user_id, guideline_text) VALUES (?, ?)', [userId, v]);
              }
            }
          } catch (_) {}
        }
        created.push({ id: userId, email, tempPassword: temp });
        const subject = 'Your AdviSys account credentials';
        const loginUrl = `${APP_BASE_URL}/login`;
        const html = `
          <p>Hello ${full_name},</p>
          <p>Your account has been created on AdviSys.</p>
          <p><strong>Email:</strong> ${email}<br/><strong>Password:</strong> ${temp}</p>
          <p>Sign in at <a href="${loginUrl}">${loginUrl}</a> and make sure to change this password after logging in.</p>
        `;
        try { await sendEmail({ to: email, subject, html }); } catch (_) {}
      } catch (e) {
        failed.push({ email: String(r.email || '').trim().toLowerCase(), error: e?.message || 'Create failed' });
      }
    }
    await conn.commit();
    return res.json({ success: true, createdCount: created.length, failedCount: failed.length, created, failed });
  } catch (err) {
    await conn.rollback();
    console.error('Bulk create error:', err);
    return res.status(500).json({ error: 'Bulk create failed' });
  } finally {
    try { await conn.release(); } catch (_) {}
  }
});

// Bulk deactivate users
// POST /api/users/bulk-deactivate
// { userIds: number[], reason: 'graduated'|'dropped'|'other', otherReason?, termId?, archiveOpenConsultations?: boolean, cancelAdvisorSlots?: boolean }
router.post('/bulk-deactivate', async (req, res) => {
  const pool = getPool();
  const { userIds, reason, otherReason, termId, archiveOpenConsultations, cancelAdvisorSlots } = req.body || {};
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'userIds is required' });
  }
  try {
    await ensureUserDeactivationEvents(pool);
    const term = termId ? Number(termId) : null;
    const reasonNorm = ['graduated','dropped'].includes(String(reason)) ? String(reason) : 'other';
    const ids = userIds.map(Number).filter(n => Number.isFinite(n));

    // Update statuses
    await pool.query(`UPDATE users SET status = 'inactive' WHERE id IN (${ids.map(()=>'?').join(',')})`, ids);
    await pool.query(`UPDATE advisor_profiles SET status = 'unavailable' WHERE user_id IN (${ids.map(()=>'?').join(',')})`, ids);

    // Audit rows
    const auditValues = ids.map(id => [id, term || null, reasonNorm, reasonNorm==='other' ? (otherReason || null) : null]);
    if (auditValues.length) {
      await pool.query(
        `INSERT INTO user_deactivation_events (user_id, term_id, reason, other_reason) VALUES ${auditValues.map(()=>'(?,?,?,?)').join(',')}`,
        auditValues.flat()
      );
    }

    // Unenroll students from all terms when deactivated
    const deactivationStatus = (reasonNorm === 'graduated' || reasonNorm === 'dropped') ? reasonNorm : 'dropped';
    
    // Update enrollment status in all terms where students are enrolled
    await pool.query(
      `UPDATE academic_term_memberships SET status_in_term = ? WHERE role = 'student' AND status_in_term = 'enrolled' AND user_id IN (${ids.map(()=>'?').join(',')})`,
      [deactivationStatus, ...ids]
    );
    
    // If specific term provided, also archive consultations for that term
    if (term && archiveOpenConsultations && (reasonNorm === 'graduated' || reasonNorm === 'dropped')) {
      await pool.query(
        `UPDATE consultations SET archived_at = IFNULL(archived_at, NOW()), archive_reason = ? WHERE academic_term_id = ? AND status IN ('pending','approved') AND student_user_id IN (${ids.map(()=>'?').join(',')})`,
        [reasonNorm, term, ...ids]
      );
    }

    // Optional: cancel advisor slots in term
    if (term && cancelAdvisorSlots) {
      await pool.query(
        `UPDATE advisor_slots SET status = 'cancelled' WHERE status = 'available' AND advisor_user_id IN (${ids.map(()=>'?').join(',')}) AND DATE(start_datetime) BETWEEN (SELECT start_date FROM academic_terms WHERE id = ?) AND (SELECT end_date FROM academic_terms WHERE id = ?)`,
        [...ids, term, term]
      );
    }

    res.json({ success: true, count: ids.length });
  } catch (err) {
    console.error('Bulk deactivate error:', err);
    res.status(500).json({ error: 'Bulk deactivate failed' });
  }
});
