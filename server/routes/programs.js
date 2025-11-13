const express = require('express');
const router = express.Router();
const { getPool } = require('../db/pool');

// List programs
router.get('/', async (req, res) => {
  const pool = getPool();
  try {
    const [rows] = await pool.query('SELECT id, name FROM programs ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('List programs error', err);
    res.status(500).json({ error: 'Failed to list programs' });
  }
});

// Create program
router.post('/', async (req, res) => {
  const pool = getPool();
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const trimmed = String(name).trim();
    const [dup] = await pool.query('SELECT id FROM programs WHERE name = ? LIMIT 1', [trimmed]);
    if (dup.length) return res.status(409).json({ error: 'Program already exists' });
    const [r] = await pool.query('INSERT INTO programs (name) VALUES (?)', [trimmed]);
    res.json({ id: r.insertId, name: trimmed });
  } catch (err) {
    console.error('Create program error', err);
    res.status(500).json({ error: 'Failed to create program' });
  }
});

// Update program
router.patch('/:id', async (req, res) => {
  const pool = getPool();
  const id = Number(req.params.id);
  const { name } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const trimmed = String(name).trim();
    const [dup] = await pool.query('SELECT id FROM programs WHERE name = ? AND id <> ? LIMIT 1', [trimmed, id]);
    if (dup.length) return res.status(409).json({ error: 'Program already exists' });
    const [r] = await pool.query('UPDATE programs SET name = ? WHERE id = ?', [trimmed, id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Program not found' });
    res.json({ id, name: trimmed });
  } catch (err) {
    console.error('Update program error', err);
    res.status(500).json({ error: 'Failed to update program' });
  }
});

// Delete program
router.delete('/:id', async (req, res) => {
  const pool = getPool();
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    // Prevent delete when referenced by student_profiles
    const [[ref]] = await pool.query('SELECT COUNT(1) AS cnt FROM student_profiles WHERE program_id = ?', [id]);
    if (ref && ref.cnt > 0) return res.status(409).json({ error: 'Program is in use by student profiles' });
    const [r] = await pool.query('DELETE FROM programs WHERE id = ?', [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Program not found' });
    res.json({ id, success: true });
  } catch (err) {
    console.error('Delete program error', err);
    res.status(500).json({ error: 'Failed to delete program' });
  }
});

module.exports = router;