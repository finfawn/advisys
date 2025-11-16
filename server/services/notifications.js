const { sendEmail } = require('./email');
const { getPool } = require('../db/pool');

async function ensureNotificationsMutedColumn(poolOrConn) {
  try {
    const [cols] = await poolOrConn.query('SHOW COLUMNS FROM notification_settings LIKE "notifications_muted"');
    if (!cols || cols.length === 0) {
      await poolOrConn.query('ALTER TABLE notification_settings ADD COLUMN notifications_muted TINYINT(1) NOT NULL DEFAULT 0');
    }
  } catch (_) {}
}

async function getNotificationSettings(userId) {
  const pool = getPool();
  try {
    await ensureNotificationsMutedColumn(pool);
    const [[row]] = await pool.query(
      `SELECT email_notifications, consultation_reminders, new_request_notifications, notifications_muted
       FROM notification_settings WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    if (!row) {
      return {
        email_notifications: false,
        consultation_reminders: true,
        new_request_notifications: true,
        notifications_muted: false,
      };
    }
    return {
      email_notifications: !!row.email_notifications,
      consultation_reminders: !!row.consultation_reminders,
      new_request_notifications: !!row.new_request_notifications,
      notifications_muted: !!row.notifications_muted,
    };
  } catch (_) {
    return {
      email_notifications: false,
      consultation_reminders: true,
      new_request_notifications: true,
      notifications_muted: false,
    };
  }
}

function shouldEmailType(type) {
  const allowed = new Set([
    'consultation_request',
    'consultation_request_submitted',
    'consultation_approved',
    'consultation_declined',
    'consultation_cancelled',
    'consultation_rescheduled',
    'consultation_reminder',
    'consultation_missed',
    'consultation_room_ready',
    'consultation_summary_updated',
    'consultation_summary_edit_requested',
    'consultation_summary_edit_approved',
    'consultation_summary_edit_declined',
    'system_announcement',
  ]);
  return allowed.has(String(type || '').toLowerCase());
}

function buildEmailHtml({ title, message, role, data }) {
  const appBase = (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
  const targetPath = role === 'advisor'
    ? '/advisor-dashboard/consultations'
    : role === 'admin'
      ? '/admin-dashboard'
      : '/student-dashboard/consultations';
  const url = `${appBase}${targetPath}`;

  const extra = [];
  if (data && data.date && data.time) extra.push(`<p><strong>When:</strong> ${data.date} • ${data.time}</p>`);
  if (data && data.threshold_minutes != null) extra.push(`<p><strong>Reminder:</strong> ${data.threshold_minutes} minutes before</p>`);
  if (data && data.location) extra.push(`<p><strong>Location:</strong> ${data.location}</p>`);
  if (data && data.room_name) extra.push(`<p><strong>Room:</strong> ${data.room_name}</p>`);

  const brandColor = '#111827';
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111">
    <h2 style="margin:0 0 8px 0;">${escapeHtml(title || 'Notification')}</h2>
    <p style="margin:0 0 12px 0;">${escapeHtml(message || '')}</p>
    ${extra.join('')}
    <div style="margin:20px 0;">
      <a href="${url}"
         style="display:inline-block;background:${brandColor};color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;min-width:200px;text-align:center;">
        Open in AdviSys
      </a>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
    <p style="font-size:12px;color:#6b7280;margin:0;">You can manage your notification preferences in your profile settings.</p>
  </div>`;
  return html;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function notify(poolOrConn, userId, type, title, message, data = null) {
  try {
    // Prefer provided pool/connection; fallback to global pool if needed
    const db = poolOrConn || getPool();

    // Settings and mute
    const settings = await getNotificationSettings(userId);
    if (settings.notifications_muted) return null;

    // Insert in-app notification first
    const dataJson = data ? JSON.stringify(data) : null;
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, data_json) VALUES (?,?,?,?,?)`,
      [userId, type, title, message, dataJson]
    );

    // Decide on email delivery
    if (!settings.email_notifications) return null;
    if (!shouldEmailType(type)) return null;
    if (String(type).toLowerCase() === 'consultation_reminder' && !settings.consultation_reminders) return null;
    if (String(type).toLowerCase() === 'consultation_request' && !settings.new_request_notifications) return null;

    // Load user email and role
    const [[user]] = await db.query('SELECT email, role, full_name FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!user || !user.email) return null;

    const html = buildEmailHtml({ title, message, role: user.role, data });
    try {
      await sendEmail({ to: user.email, subject: title || 'Notification', html });
    } catch (emailErr) {
      console.warn('Notification email send failed:', emailErr?.message || emailErr);
    }
    return true;
  } catch (err) {
    console.error('notify() failed:', err?.message || err);
    return null;
  }
}

module.exports = { notify, getNotificationSettings };