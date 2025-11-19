const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const { getPool } = require('../db/pool');

function formatYear(yearLevel) {
  const n = Number(yearLevel);
  if (!n || n < 1) return '1st Year';
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${suffix} Year`;
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
        `SELECT u.id, u.full_name AS name, u.email, u.role, u.status
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
      }));
      return res.json(data);
    }
    if (role === 'student') {
      const [rows] = await pool.query(
        `SELECT u.id, u.full_name AS name, u.email, u.role, u.status,
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
      }));
      return res.json(data);
    }

    if (role === 'advisor') {
      const [rows] = await pool.query(
        `SELECT u.id, u.full_name AS name, u.email, u.role, u.status,
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
      }));
      return res.json(data);
    }

    // Return both students and advisors if no role filter
    const [studentRows] = await pool.query(
      `SELECT u.id, u.full_name AS name, u.email, u.role, u.status,
              sp.program, sp.year_level, sp.avatar_url
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE u.role = 'student'
       ORDER BY u.id ASC`
    );
    const [advisorRows] = await pool.query(
      `SELECT u.id, u.full_name AS name, u.email, u.role, u.status,
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
    if (typeof full_name === 'string') { fields.push('full_name = ?'); values.push(full_name); }
    if (typeof email === 'string') { fields.push('email = ?'); values.push(email); }
    if (typeof status === 'string') { fields.push('status = ?'); values.push(status === 'active' ? 'active' : 'inactive'); }
    if (typeof password === 'string' && password.length > 0) {
      const hashed = await bcrypt.hash(password, 10);
      fields.push('password_hash = ?');
      values.push(hashed);
    }
    if (fields.length) {
      values.push(userId);
      await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    // Role-specific tables
    if (roleToUse === 'student') {
      const sFields = [];
      const sValues = [];
      if (typeof program === 'string') { sFields.push('program = ?'); sValues.push(program); }
      if (typeof year_level !== 'undefined') { sFields.push('year_level = ?'); sValues.push(Number(year_level) || 1); }
      if (typeof avatar_url !== 'undefined') { sFields.push('avatar_url = ?'); sValues.push(avatar_url || null); }
      if (sFields.length) {
        sValues.push(userId);
        await pool.query(`UPDATE student_profiles SET ${sFields.join(', ')} WHERE user_id = ?`, sValues);
      }
    }
    if (roleToUse === 'advisor') {
      const aFields = [];
      const aValues = [];
      if (typeof department === 'string') { aFields.push('department = ?'); aValues.push(department); }
      if (typeof title === 'string') { aFields.push('title = ?'); aValues.push(title); }
      if (typeof avatar_url !== 'undefined') { aFields.push('avatar_url = ?'); aValues.push(avatar_url || null); }
      if (aFields.length) {
        aValues.push(userId);
        await pool.query(`UPDATE advisor_profiles SET ${aFields.join(', ')} WHERE user_id = ?`, aValues);
      }
    }

    res.json({ id: Number(userId), success: true });
  } catch (err) {
    console.error('Failed to update user:', err);
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
    await pool.query('DELETE FROM student_profiles WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM advisor_profiles WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM consultations WHERE student_id = ? OR advisor_id = ?', [userId, userId]);
    await pool.query('DELETE FROM notifications WHERE user_id = ?', [userId]);

    // Now delete the user
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ id: Number(userId), success: true });
  } catch (err) {
    console.error('Failed to delete user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
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
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'firstName, lastName, email, password required' });
  }
  try {
    const emailNorm = String(email).trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [emailNorm]);
    if (existing.length) return res.status(409).json({ error: 'Email already registered' });
    const password_hash = await bcrypt.hash(String(password), 10);
    const full_name = `${String(firstName).trim()} ${String(lastName).trim()}`.trim();
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
    await pool.query('UPDATE advisor_profiles SET status = ? WHERE user_id = ?', [newStatus === 'active' ? 'available' : 'inactive', userId]);

    // Check if user is a student
    const [[userCheck]] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
    const isStudent = userCheck && String(userCheck.role).toLowerCase() === 'student';

    // If student is being activated, remove from all term memberships (active students can't be enrolled)
    if (newStatus === 'active' && isStudent) {
      await pool.query(
        `DELETE FROM academic_term_memberships WHERE user_id = ? AND role = 'student'`,
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
    await pool.query(`UPDATE advisor_profiles SET status = 'inactive' WHERE user_id IN (${ids.map(()=>'?').join(',')})`, ids);

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
