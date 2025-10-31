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
