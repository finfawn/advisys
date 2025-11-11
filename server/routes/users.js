const express = require('express');
const router = express.Router();
const { getPool } = require('../db/pool');

function formatYear(yearLevel) {
  const n = Number(yearLevel);
  if (!n || n < 1) return '1st Year';
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${suffix} Year`;
}

// GET /api/users
// Optional query params:
// - role=student|advisor (filter by role)
router.get('/', async (req, res) => {
  const pool = getPool();
  const { role } = req.query;
  try {
    if (role === 'student') {
      const [rows] = await pool.query(
        `SELECT u.id, u.full_name AS name, u.email, u.role, u.status,
                sp.program, sp.year_level
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
      }));
      return res.json(data);
    }

    if (role === 'advisor') {
      const [rows] = await pool.query(
        `SELECT u.id, u.full_name AS name, u.email, u.role, u.status,
                ap.department, ap.title
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
      }));
      return res.json(data);
    }

    // Return both students and advisors if no role filter
    const [studentRows] = await pool.query(
      `SELECT u.id, u.full_name AS name, u.email, u.role, u.status,
              sp.program, sp.year_level
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE u.role = 'student'
       ORDER BY u.id ASC`
    );
    const [advisorRows] = await pool.query(
      `SELECT u.id, u.full_name AS name, u.email, u.role, u.status,
              ap.department, ap.title
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
    }));
    const advisors = advisorRows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: 'advisor',
      active: r.status === 'active',
      department: r.department || null,
      title: r.title || null,
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
    if (typeof password === 'string' && password.length > 0) { fields.push('password_hash = ?'); values.push(password); }
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

module.exports = router;

// Update user status (activate/deactivate)
// PATCH /api/users/:id/status { active: boolean } or { status: 'active'|'inactive' }
router.patch('/:id/status', async (req, res) => {
  const pool = getPool();
  const userId = req.params.id;
  try {
    const { active, status } = req.body || {};
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

    res.json({ id: Number(userId), status: newStatus });
  } catch (err) {
    console.error('Failed to update user status:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});
