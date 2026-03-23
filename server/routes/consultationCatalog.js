const express = require('express');
const { getPool } = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

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

function normalizeTopicName(value) {
  return String(value || '').trim();
}

function normalizeSubjectCode(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function normalizeSubjectName(value) {
  return String(value || '').trim();
}

router.get('/', async (_req, res) => {
  const pool = getPool();
  try {
    const [topics] = await pool.query(
      'SELECT id, name, updated_at FROM consultation_topic_catalog ORDER BY updated_at DESC, id DESC'
    );
    const [subjects] = await pool.query(
      'SELECT id, subject_code, subject_name, updated_at FROM consultation_subject_catalog ORDER BY updated_at DESC, id DESC'
    );
    res.json({
      topics: Array.isArray(topics) ? topics : [],
      subjects: Array.isArray(subjects) ? subjects : [],
    });
  } catch (err) {
    if (err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146)) {
      return res.json({ topics: [], subjects: [] });
    }
    console.error('List consultation catalog error', err);
    res.status(500).json({ error: 'Failed to load consultation catalog' });
  }
});

router.post('/topics', authMiddleware, ensureAdmin, async (req, res) => {
  const pool = getPool();
  const name = normalizeTopicName(req.body?.name);
  if (!name) return res.status(400).json({ error: 'Topic name is required' });
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [dup] = await conn.query(
        'SELECT id FROM consultation_topic_catalog WHERE name = ? LIMIT 1',
        [name]
      );
      if (dup.length) {
        await conn.rollback();
        return res.status(409).json({ error: 'Topic already exists in the catalog' });
      }
      const [result] = await conn.query(
        'INSERT INTO consultation_topic_catalog (name) VALUES (?)',
        [name]
      );
      await conn.commit();
      res.json({ id: result.insertId, name });
    } catch (txErr) {
      try { await conn.rollback(); } catch (_) {}
      console.error('Create consultation topic tx error', { name, userId: req.user?.id, txErr });
      res.status(500).json({ error: 'Failed to create consultation topic' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Create consultation topic error', { name, userId: req.user?.id, err });
    res.status(500).json({ error: 'Failed to create consultation topic' });
  }
});

router.patch('/topics/:id', authMiddleware, ensureAdmin, async (req, res) => {
  const pool = getPool();
  const id = Number(req.params.id);
  const name = normalizeTopicName(req.body?.name);
  if (!id) return res.status(400).json({ error: 'Invalid topic id' });
  if (!name) return res.status(400).json({ error: 'Topic name is required' });
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [dup] = await conn.query(
        'SELECT id FROM consultation_topic_catalog WHERE name = ? AND id <> ? LIMIT 1',
        [name, id]
      );
      if (dup.length) {
        await conn.rollback();
        return res.status(409).json({ error: 'Topic already exists in the catalog' });
      }
      const [result] = await conn.query(
        'UPDATE consultation_topic_catalog SET name = ? WHERE id = ?',
        [name, id]
      );
      if (!result.affectedRows) {
        await conn.rollback();
        return res.status(404).json({ error: 'Topic not found' });
      }
      await conn.commit();
      res.json({ id, name });
    } catch (txErr) {
      try { await conn.rollback(); } catch (_) {}
      console.error('Update consultation topic tx error', { id, name, userId: req.user?.id, txErr });
      res.status(500).json({ error: 'Failed to update consultation topic' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Update consultation topic error', { id, name, userId: req.user?.id, err });
    res.status(500).json({ error: 'Failed to update consultation topic' });
  }
});

router.delete('/topics/:id', authMiddleware, ensureAdmin, async (req, res) => {
  const pool = getPool();
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid topic id' });
  try {
    const [result] = await pool.query(
      'DELETE FROM consultation_topic_catalog WHERE id = ?',
      [id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    res.json({ id, success: true });
  } catch (err) {
    console.error('Delete consultation topic error', { id, userId: req.user?.id, err });
    res.status(500).json({ error: 'Failed to delete consultation topic' });
  }
});

router.post('/subjects', authMiddleware, ensureAdmin, async (req, res) => {
  const pool = getPool();
  const subjectCode = normalizeSubjectCode(req.body?.subject_code || req.body?.code);
  const subjectName = normalizeSubjectName(req.body?.subject_name || req.body?.name);
  if (!subjectCode || !subjectName) {
    return res.status(400).json({ error: 'Subject code and name are required' });
  }
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [dup] = await conn.query(
        'SELECT id FROM consultation_subject_catalog WHERE subject_code = ? LIMIT 1',
        [subjectCode]
      );
      if (dup.length) {
        await conn.rollback();
        return res.status(409).json({ error: 'Subject code already exists in the catalog' });
      }
      const [result] = await conn.query(
        'INSERT INTO consultation_subject_catalog (subject_code, subject_name) VALUES (?, ?)',
        [subjectCode, subjectName]
      );
      await conn.commit();
      res.json({ id: result.insertId, subject_code: subjectCode, subject_name: subjectName });
    } catch (txErr) {
      try { await conn.rollback(); } catch (_) {}
      console.error('Create consultation subject tx error', { subjectCode, subjectName, userId: req.user?.id, txErr });
      res.status(500).json({ error: 'Failed to create consultation subject' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Create consultation subject error', { subjectCode, subjectName, userId: req.user?.id, err });
    res.status(500).json({ error: 'Failed to create consultation subject' });
  }
});

router.patch('/subjects/:id', authMiddleware, ensureAdmin, async (req, res) => {
  const pool = getPool();
  const id = Number(req.params.id);
  const subjectCode = normalizeSubjectCode(req.body?.subject_code || req.body?.code);
  const subjectName = normalizeSubjectName(req.body?.subject_name || req.body?.name);
  if (!id) return res.status(400).json({ error: 'Invalid subject id' });
  if (!subjectCode || !subjectName) {
    return res.status(400).json({ error: 'Subject code and name are required' });
  }
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [dup] = await conn.query(
        'SELECT id FROM consultation_subject_catalog WHERE subject_code = ? AND id <> ? LIMIT 1',
        [subjectCode, id]
      );
      if (dup.length) {
        await conn.rollback();
        return res.status(409).json({ error: 'Subject code already exists in the catalog' });
      }
      const [result] = await conn.query(
        'UPDATE consultation_subject_catalog SET subject_code = ?, subject_name = ? WHERE id = ?',
        [subjectCode, subjectName, id]
      );
      if (!result.affectedRows) {
        await conn.rollback();
        return res.status(404).json({ error: 'Subject not found' });
      }
      await conn.commit();
      res.json({ id, subject_code: subjectCode, subject_name: subjectName });
    } catch (txErr) {
      try { await conn.rollback(); } catch (_) {}
      console.error('Update consultation subject tx error', { id, subjectCode, subjectName, userId: req.user?.id, txErr });
      res.status(500).json({ error: 'Failed to update consultation subject' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Update consultation subject error', { id, subjectCode, subjectName, userId: req.user?.id, err });
    res.status(500).json({ error: 'Failed to update consultation subject' });
  }
});

router.delete('/subjects/:id', authMiddleware, ensureAdmin, async (req, res) => {
  const pool = getPool();
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid subject id' });
  try {
    const [result] = await pool.query(
      'DELETE FROM consultation_subject_catalog WHERE id = ?',
      [id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json({ id, success: true });
  } catch (err) {
    console.error('Delete consultation subject error', { id, userId: req.user?.id, err });
    res.status(500).json({ error: 'Failed to delete consultation subject' });
  }
});

module.exports = router;
