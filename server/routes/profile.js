const express = require('express');
const { getPool } = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/profile/me
router.get('/me', authMiddleware, async (req, res) => {
  const pool = getPool();
  const userId = req.user?.id;
  try {
    const [uRows] = await pool.query('SELECT id, role, email, full_name FROM users WHERE id = ?', [userId]);
    if (!uRows.length) return res.status(404).json({ error: 'User not found' });
    const u = uRows[0];
    const result = { id: u.id, role: u.role, email: u.email, full_name: u.full_name };
    if (u.role === 'student') {
      const [sRows] = await pool.query('SELECT program, year_level, avatar_url FROM student_profiles WHERE user_id = ?', [userId]);
      if (sRows.length) Object.assign(result, sRows[0]);
    } else if (u.role === 'advisor') {
      const [aRows] = await pool.query('SELECT department, title, avatar_url FROM advisor_profiles WHERE user_id = ?', [userId]);
      if (aRows.length) Object.assign(result, aRows[0]);
    }
    return res.json(result);
  } catch (err) {
    console.error('Profile fetch failed:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PATCH /api/profile/me
// Body may include: full_name (or firstName+lastName), email, program, year_level, department, title, avatar_url
router.patch('/me', authMiddleware, async (req, res) => {
  const pool = getPool();
  const userId = req.user?.id;
  const body = req.body || {};
  try {
    // Update users table
    let fullName = body.full_name;
    if (!fullName && body.firstName && body.lastName) {
      fullName = `${String(body.firstName).trim()} ${String(body.lastName).trim()}`;
    }
    if (fullName || body.email) {
      const fields = [];
      const values = [];
      if (fullName) { fields.push('full_name = ?'); values.push(fullName); }
      if (body.email) { fields.push('email = ?'); values.push(body.email); }
      if (fields.length) {
        values.push(userId);
        await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      }
    }

    // Update role-specific profile
    const [uRows] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!uRows.length) return res.status(404).json({ error: 'User not found' });
    const role = uRows[0].role;
    if (role === 'student') {
      const fields = [];
      const values = [];
      if (body.program !== undefined) { fields.push('program = ?'); values.push(body.program || null); }
      if (body.year_level !== undefined || body.yearLevel !== undefined) {
        const yr = body.year_level ?? body.yearLevel;
        fields.push('year_level = ?'); values.push(yr ? String(yr) : null);
      }
      if (body.avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(body.avatar_url || null); }
      if (fields.length) {
        values.push(userId);
        await pool.query(`UPDATE student_profiles SET ${fields.join(', ')} WHERE user_id = ?`, values);
      }
    } else if (role === 'advisor') {
      const fields = [];
      const values = [];
      if (body.department !== undefined) { fields.push('department = ?'); values.push(body.department || null); }
      if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title || null); }
      if (body.avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(body.avatar_url || null); }
      if (fields.length) {
        values.push(userId);
        await pool.query(`UPDATE advisor_profiles SET ${fields.join(', ')} WHERE user_id = ?`, values);
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Profile update failed:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;