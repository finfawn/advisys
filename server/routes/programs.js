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

// List programs
// Public read: program names are non-sensitive and needed for dropdowns
router.get('/', async (req, res) => {
  const pool = getPool();
  try {
    const [rows] = await pool.query('SELECT id, name, updated_at FROM programs ORDER BY updated_at DESC, id DESC');
    res.json(rows);
  } catch (err) {
    console.error('List programs error', err);
    res.status(500).json({ error: 'Failed to list programs' });
  }
});

// Create program
router.post('/', authMiddleware, ensureAdmin, async (req, res) => {
  const pool = getPool();
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const trimmed = String(name).trim();
      const [dup] = await conn.query('SELECT id FROM programs WHERE name = ? LIMIT 1', [trimmed]);
      if (dup.length) {
        await conn.rollback();
        return res.status(409).json({ error: 'Program already exists' });
      }
      const [r] = await conn.query('INSERT INTO programs (name) VALUES (?)', [trimmed]);
      await conn.commit();
      res.json({ id: r.insertId, name: trimmed });
    } catch (txErr) {
      try { await conn.rollback(); } catch (_) {}
      console.error('Create program tx error', { name, userId: req.user?.id, txErr });
      return res.status(500).json({ error: 'Failed to create program' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Create program error', { name, userId: req.user?.id, err });
    res.status(500).json({ error: 'Failed to create program' });
  }
});

// Update program
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
      const [dup] = await conn.query('SELECT id FROM programs WHERE name = ? AND id <> ? LIMIT 1', [trimmed, id]);
      if (dup.length) {
        await conn.rollback();
        return res.status(409).json({ error: 'Program already exists' });
      }
      const [r] = await conn.query('UPDATE programs SET name = ? WHERE id = ?', [trimmed, id]);
      if (!r.affectedRows) {
        await conn.rollback();
        return res.status(404).json({ error: 'Program not found' });
      }
      await conn.commit();
      res.json({ id, name: trimmed });
    } catch (txErr) {
      try { await conn.rollback(); } catch (_) {}
      console.error('Update program tx error', { id, name, userId: req.user?.id, txErr });
      return res.status(500).json({ error: 'Failed to update program' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Update program error', { id, name, userId: req.user?.id, err });
    res.status(500).json({ error: 'Failed to update program' });
  }
});

// Delete program
router.delete('/:id', authMiddleware, ensureAdmin, async (req, res) => {
  const pool = getPool();
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[ref]] = await conn.query('SELECT COUNT(1) AS cnt FROM student_profiles WHERE program_id = ?', [id]);
      if (ref && ref.cnt > 0) {
        await conn.rollback();
        return res.status(409).json({ error: 'Program is in use by student profiles' });
      }
      const [r] = await conn.query('DELETE FROM programs WHERE id = ?', [id]);
      if (!r.affectedRows) {
        await conn.rollback();
        return res.status(404).json({ error: 'Program not found' });
      }
      await conn.commit();
      res.json({ id, success: true });
    } catch (txErr) {
      try { await conn.rollback(); } catch (_) {}
      console.error('Delete program tx error', { id, userId: req.user?.id, txErr });
      return res.status(500).json({ error: 'Failed to delete program' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Delete program error', { id, userId: req.user?.id, err });
    res.status(500).json({ error: 'Failed to delete program' });
  }
});

module.exports = router;
