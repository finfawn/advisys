const express = require('express');
const router = express.Router();
const { getPool } = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

function ensureAdmin(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin access required' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Authorization check failed' });
  }
}

// List departments
// Public read: department names are non-sensitive and needed for dropdowns
router.get('/', async (req, res) => {
  const pool = getPool();
  try {
    const [rows] = await pool.query('SELECT id, name FROM departments ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('List departments error', err);
    res.status(500).json({ error: 'Failed to list departments' });
  }
});

// Create department
router.post('/', authMiddleware, ensureAdmin, async (req, res) => {
  const pool = getPool();
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const trimmed = String(name).trim();
      const [dup] = await conn.query('SELECT id FROM departments WHERE name = ? LIMIT 1', [trimmed]);
      if (dup.length) {
        await conn.rollback();
        return res.status(409).json({ error: 'Department already exists' });
      }
      const [r] = await conn.query('INSERT INTO departments (name) VALUES (?)', [trimmed]);
      await conn.commit();
      res.json({ id: r.insertId, name: trimmed });
    } catch (txErr) {
      try { await conn.rollback(); } catch (_) {}
      console.error('Create department tx error', { name, userId: req.user?.id, txErr });
      return res.status(500).json({ error: 'Failed to create department' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Create department error', { name, userId: req.user?.id, err });
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// Update department
router.patch('/:id', authMiddleware, ensureAdmin, async (req, res) => {
  const pool = getPool();
  const id = Number(req.params.id);
  const { name } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const trimmed = String(name).trim();
      const [dup] = await conn.query('SELECT id FROM departments WHERE name = ? AND id <> ? LIMIT 1', [trimmed, id]);
      if (dup.length) {
        await conn.rollback();
        return res.status(409).json({ error: 'Department already exists' });
      }
      const [r] = await conn.query('UPDATE departments SET name = ? WHERE id = ?', [trimmed, id]);
      if (!r.affectedRows) {
        await conn.rollback();
        return res.status(404).json({ error: 'Department not found' });
      }
      await conn.commit();
      res.json({ id, name: trimmed });
    } catch (txErr) {
      try { await conn.rollback(); } catch (_) {}
      console.error('Update department tx error', { id, name, userId: req.user?.id, txErr });
      return res.status(500).json({ error: 'Failed to update department' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Update department error', { id, name, userId: req.user?.id, err });
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// Delete department
router.delete('/:id', authMiddleware, ensureAdmin, async (req, res) => {
  const pool = getPool();
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Prevent delete when referenced by advisor_profiles
      const [[ref]] = await conn.query('SELECT COUNT(1) AS cnt FROM advisor_profiles WHERE department_id = ?', [id]);
      if (ref && ref.cnt > 0) {
        await conn.rollback();
        return res.status(409).json({ error: 'Department is in use by advisor profiles' });
      }
      const [r] = await conn.query('DELETE FROM departments WHERE id = ?', [id]);
      if (!r.affectedRows) {
        await conn.rollback();
        return res.status(404).json({ error: 'Department not found' });
      }
      await conn.commit();
      res.json({ id, success: true });
    } catch (txErr) {
      try { await conn.rollback(); } catch (_) {}
      console.error('Delete department tx error', { id, userId: req.user?.id, txErr });
      return res.status(500).json({ error: 'Failed to delete department' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Delete department error', { id, userId: req.user?.id, err });
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

module.exports = router;