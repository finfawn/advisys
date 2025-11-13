const express = require('express');
const router = express.Router();
const { getPool } = require('../db/pool');

// List departments
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
router.post('/', async (req, res) => {
  const pool = getPool();
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const trimmed = String(name).trim();
    const [dup] = await pool.query('SELECT id FROM departments WHERE name = ? LIMIT 1', [trimmed]);
    if (dup.length) return res.status(409).json({ error: 'Department already exists' });
    const [r] = await pool.query('INSERT INTO departments (name) VALUES (?)', [trimmed]);
    res.json({ id: r.insertId, name: trimmed });
  } catch (err) {
    console.error('Create department error', err);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// Update department
router.patch('/:id', async (req, res) => {
  const pool = getPool();
  const id = Number(req.params.id);
  const { name } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const trimmed = String(name).trim();
    const [dup] = await pool.query('SELECT id FROM departments WHERE name = ? AND id <> ? LIMIT 1', [trimmed, id]);
    if (dup.length) return res.status(409).json({ error: 'Department already exists' });
    const [r] = await pool.query('UPDATE departments SET name = ? WHERE id = ?', [trimmed, id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Department not found' });
    res.json({ id, name: trimmed });
  } catch (err) {
    console.error('Update department error', err);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// Delete department
router.delete('/:id', async (req, res) => {
  const pool = getPool();
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    // Prevent delete when referenced by advisor_profiles
    const [[ref]] = await pool.query('SELECT COUNT(1) AS cnt FROM advisor_profiles WHERE department_id = ?', [id]);
    if (ref && ref.cnt > 0) return res.status(409).json({ error: 'Department is in use by advisor profiles' });
    const [r] = await pool.query('DELETE FROM departments WHERE id = ?', [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Department not found' });
    res.json({ id, success: true });
  } catch (err) {
    console.error('Delete department error', err);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

module.exports = router;