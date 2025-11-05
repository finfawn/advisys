const express = require('express');
const { getPool } = require('../db/pool');

const router = express.Router();

function toClientRow(r) {
  let data = null;
  try {
    data = r.data_json ? JSON.parse(r.data_json) : null;
  } catch (e) {
    data = null;
  }
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    message: r.message,
    timestamp: r.created_at,
    isRead: !!r.is_read,
    data,
  };
}

// GET /api/notifications/users/:userId/notifications
router.get('/users/:userId/notifications', async (req, res) => {
  const pool = getPool();
  try {
    const userId = req.params.userId;
    const [rows] = await pool.query(
      `SELECT id, user_id, type, title, message, data_json, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC`, [userId]
    );
    return res.json(rows.map(toClientRow));
  } catch (err) {
    console.error('Fetch notifications error', err);
    return res.status(500).json({ error: 'Failed to load notifications' });
  }
});

// POST /api/notifications
// Body: { user_id, type, title, message, data }
router.post('/', async (req, res) => {
  const pool = getPool();
  try {
    const { user_id, type, title, message, data } = req.body || {};
    if (!user_id || !type || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields: user_id, type, title, message' });
    }
    const dataJson = data ? JSON.stringify(data) : null;
    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data_json) VALUES (?,?,?,?,?)`,
      [user_id, type, title, message, dataJson]
    );
    const id = result.insertId;
    const [[row]] = await pool.query(
      `SELECT id, user_id, type, title, message, data_json, is_read, created_at FROM notifications WHERE id = ?`,
      [id]
    );
    return res.status(201).json(toClientRow(row));
  } catch (err) {
    console.error('Create notification error', err);
    return res.status(500).json({ error: 'Failed to create notification' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  const pool = getPool();
  try {
    const id = req.params.id;
    const [result] = await pool.query(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Mark notification read error', err);
    return res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// PATCH /api/notifications/read-all
// Body: { user_id }
router.patch('/read-all', async (req, res) => {
  const pool = getPool();
  try {
    const { user_id } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'Missing required field: user_id' });
    await pool.query(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [user_id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('Mark all read error', err);
    return res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  const pool = getPool();
  try {
    const id = req.params.id;
    const [result] = await pool.query(`DELETE FROM notifications WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete notification error', err);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// DELETE /api/notifications/clear
// Body: { user_id }
router.delete('/clear', async (req, res) => {
  const pool = getPool();
  try {
    const { user_id } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'Missing required field: user_id' });
    const [result] = await pool.query(`DELETE FROM notifications WHERE user_id = ?`, [user_id]);
    return res.json({ success: true, deleted_count: result.affectedRows || 0 });
  } catch (err) {
    console.error('Clear notifications error', err);
    return res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

module.exports = router;