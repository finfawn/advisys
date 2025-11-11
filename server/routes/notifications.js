const express = require('express');
const { getPool } = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

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
// Only allow the authenticated user to read their own notifications.
router.get('/users/:userId/notifications', authMiddleware, async (req, res) => {
  const pool = getPool();
  try {
    const userId = Number(req.params.userId);
    const authUser = req.user || {};
    if (!authUser || Number(authUser.id) !== userId) {
      return res.status(403).json({ error: 'Forbidden: can only read your own notifications' });
    }
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
    // Respect master mute setting: if muted, suppress creation
    try {
      const [[row]] = await pool.query(
        'SELECT notifications_muted FROM notification_settings WHERE user_id = ? LIMIT 1',
        [user_id]
      );
      if (row && row.notifications_muted) {
        return res.status(202).json({ success: true, suppressed: true });
      }
    } catch (_) {
      // Ignore errors (missing table/column) and proceed
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
// Only allow the owner to mark their notification as read.
router.patch('/:id/read', authMiddleware, async (req, res) => {
  const pool = getPool();
  try {
    const id = req.params.id;
    const authUser = req.user || {};
    const [result] = await pool.query(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [id, authUser.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Mark notification read error', err);
    return res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// PATCH /api/notifications/read-all
// Marks all notifications for the authenticated user as read.
router.patch('/read-all', authMiddleware, async (req, res) => {
  const pool = getPool();
  try {
    const authUser = req.user || {};
    await pool.query(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [authUser.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('Mark all read error', err);
    return res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// DELETE /api/notifications/:id
// Only allow the owner to delete a notification.
router.delete('/:id', authMiddleware, async (req, res) => {
  const pool = getPool();
  try {
    const id = req.params.id;
    const authUser = req.user || {};
    console.log(`Attempting to delete notification with ID: ${id} for user: ${authUser.id}`);
    const [result] = await pool.query(`DELETE FROM notifications WHERE id = ? AND user_id = ?`, [id, authUser.id]);
    console.log(`Delete notification result: ${JSON.stringify(result)}`);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete notification error', err);
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// DELETE /api/notifications/clear
// Clears all notifications for the authenticated user.
router.delete('/clear', authMiddleware, async (req, res) => {
  const pool = getPool();
  try {
    const authUser = req.user || {};
    console.log(`Attempting to clear all notifications for user: ${authUser.id}`);
    const [result] = await pool.query(`DELETE FROM notifications WHERE user_id = ?`, [authUser.id]);
    console.log(`Clear all notifications result: ${JSON.stringify(result)}`);
    return res.json({ success: true, deleted_count: result.affectedRows || 0 });
  } catch (err) {
    console.error('Clear notifications error', err);
    return res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

module.exports = router;