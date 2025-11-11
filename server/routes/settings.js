const express = require('express');
const { getPool } = require('../db/pool');

const router = express.Router();

// Ensure the notifications_muted column exists for backward compatibility
async function ensureNotificationsMutedColumn(pool) {
  try {
    const [cols] = await pool.query('SHOW COLUMNS FROM notification_settings LIKE "notifications_muted"');
    if (!cols || cols.length === 0) {
      await pool.query('ALTER TABLE notification_settings ADD COLUMN notifications_muted TINYINT(1) NOT NULL DEFAULT 0');
    }
  } catch (err) {
    // If table doesn't exist yet or other error, ignore; creation path may handle it
    console.warn('ensureNotificationsMutedColumn warning:', err?.message || err);
  }
}

// GET /api/settings/users/:userId/notifications
router.get('/users/:userId/notifications', async (req, res) => {
  const pool = getPool();
  try {
    const userId = Number(req.params.userId);
    await ensureNotificationsMutedColumn(pool);
    const [[row]] = await pool.query(
      `SELECT user_id, email_notifications, consultation_reminders, new_request_notifications, notifications_muted
       FROM notification_settings WHERE user_id = ?`,
      [userId]
    );
    if (!row) {
      return res.json({
        userId,
        emailNotifications: true,
        consultationReminders: true,
        newRequestNotifications: true,
        notificationsMuted: false,
      });
    }
    return res.json({
      userId: row.user_id,
      emailNotifications: !!row.email_notifications,
      consultationReminders: !!row.consultation_reminders,
      newRequestNotifications: !!row.new_request_notifications,
      notificationsMuted: !!row.notifications_muted,
    });
  } catch (err) {
    console.error('Failed to get notification settings:', err);
    res.status(500).json({ error: 'Failed to get notification settings' });
  }
});

// PATCH /api/settings/users/:userId/notifications
router.patch('/users/:userId/notifications', async (req, res) => {
  const pool = getPool();
  try {
    const userId = Number(req.params.userId);
    await ensureNotificationsMutedColumn(pool);
    const { emailNotifications, consultationReminders, newRequestNotifications, notificationsMuted } = req.body || {};
    const [[exists]] = await pool.query('SELECT user_id FROM notification_settings WHERE user_id = ?', [userId]);
    if (exists) {
      await pool.query(
        `UPDATE notification_settings
         SET email_notifications = ?, consultation_reminders = ?, new_request_notifications = ?, notifications_muted = ?
         WHERE user_id = ?`,
        [emailNotifications ? 1 : 0, consultationReminders ? 1 : 0, newRequestNotifications ? 1 : 0, notificationsMuted ? 1 : 0, userId]
      );
    } else {
      await pool.query(
        `INSERT INTO notification_settings (user_id, email_notifications, consultation_reminders, new_request_notifications, notifications_muted)
         VALUES (?,?,?,?,?)`,
        [userId, emailNotifications ? 1 : 0, consultationReminders ? 1 : 0, newRequestNotifications ? 1 : 0, notificationsMuted ? 1 : 0]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update notification settings:', err);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// GET /api/settings/advisors/:userId
router.get('/advisors/:userId', async (req, res) => {
  const pool = getPool();
  try {
    const advisorId = Number(req.params.userId);
    const [[row]] = await pool.query(
      `SELECT advisor_user_id, auto_accept_requests, max_daily_consultations
       FROM advisor_settings WHERE advisor_user_id = ?`,
      [advisorId]
    );
    if (!row) {
      return res.json({
        advisorUserId: advisorId,
        autoAcceptRequests: false,
        maxDailyConsultations: 10,
      });
    }
    return res.json({
      advisorUserId: row.advisor_user_id,
      autoAcceptRequests: !!row.auto_accept_requests,
      maxDailyConsultations: Number(row.max_daily_consultations || 10),
    });
  } catch (err) {
    console.error('Failed to get advisor settings:', err);
    res.status(500).json({ error: 'Failed to get advisor settings' });
  }
});

// PATCH /api/settings/advisors/:userId
router.patch('/advisors/:userId', async (req, res) => {
  const pool = getPool();
  try {
    const advisorId = Number(req.params.userId);
    const { autoAcceptRequests, maxDailyConsultations } = req.body || {};
    const [[exists]] = await pool.query('SELECT advisor_user_id FROM advisor_settings WHERE advisor_user_id = ?', [advisorId]);
    if (exists) {
      await pool.query(
        `UPDATE advisor_settings
         SET auto_accept_requests = ?, max_daily_consultations = ?
         WHERE advisor_user_id = ?`,
        [autoAcceptRequests ? 1 : 0, Number(maxDailyConsultations || 10), advisorId]
      );
    } else {
      await pool.query(
        `INSERT INTO advisor_settings (advisor_user_id, auto_accept_requests, max_daily_consultations)
         VALUES (?,?,?)`,
        [advisorId, autoAcceptRequests ? 1 : 0, Number(maxDailyConsultations || 10)]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update advisor settings:', err);
    res.status(500).json({ error: 'Failed to update advisor settings' });
  }
});

module.exports = router;