const { sendEmail } = require('./email');
const { getPool } = require('../db/pool');

let notificationsMutedColumnReady = false;
let notificationsMutedColumnPromise = null;

async function ensureNotificationsMutedColumn(poolOrConn) {
  if (notificationsMutedColumnReady) return;
  if (notificationsMutedColumnPromise) return notificationsMutedColumnPromise;
  notificationsMutedColumnPromise = (async () => {
    try {
      const [cols] = await poolOrConn.query('SHOW COLUMNS FROM notification_settings LIKE "notifications_muted"');
      if (!cols || cols.length === 0) {
        await poolOrConn.query('ALTER TABLE notification_settings ADD COLUMN notifications_muted TINYINT(1) NOT NULL DEFAULT 0');
      }
      notificationsMutedColumnReady = true;
    } catch (_) {}
  })();
  try {
    await notificationsMutedColumnPromise;
  } finally {
    notificationsMutedColumnPromise = null;
  }
}

async function getNotificationSettings(userId) {
  const pool = getPool();
  try {
    await ensureNotificationsMutedColumn(pool);
    const [[row]] = await pool.query(
      `SELECT email_notifications, notifications_muted
       FROM notification_settings WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    if (!row) {
      return {
        email_notifications: false,
        notifications_muted: false,
      };
    }
    return {
      email_notifications: !!row.email_notifications,
      notifications_muted: !!row.notifications_muted,
    };
  } catch (_) {
    return {
      email_notifications: false,
      notifications_muted: false,
    };
  }
}

function shouldEmailType(type) {
  const allowed = new Set([
    // Cost-saving: only critical consultation events
    'consultation_request',
    'consultation_approved',
    'consultation_cancelled',
    'consultation_incomplete',
    'consultation_reminder',
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

  const meta = [];
  if (data && data.date && data.time) meta.push(`<div style="margin:0 0 6px 0"><span style="color:#6b7280">When:</span> <strong>${escapeHtml(data.date)} • ${escapeHtml(data.time)}</strong></div>`);
  if (data && data.threshold_minutes != null) meta.push(`<div style="margin:0 0 6px 0"><span style="color:#6b7280">Reminder:</span> ${escapeHtml(String(data.threshold_minutes))} minutes before</div>`);
  if (data && data.location) meta.push(`<div style="margin:0 0 6px 0"><span style="color:#6b7280">Location:</span> ${escapeHtml(data.location)}</div>`);
  if (data && data.room_name) meta.push(`<div style="margin:0 0 6px 0"><span style="color:#6b7280">Room:</span> ${escapeHtml(data.room_name)}</div>`);

  const brandColor = '#0F172A';
  const borderColor = '#E5E7EB';
  const textColor = '#111827';
  const mutedColor = '#6B7280';

  const html = `
  <div style="background:#F9FAFB;padding:24px">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid ${borderColor};border-radius:12px;overflow:hidden">
      <div style="background:${brandColor};color:#fff;padding:14px 18px;font-weight:600;font-size:16px">AdviSys</div>
      <div style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:${textColor}">
        <h2 style="margin:0 0 8px 0;font-size:20px">${escapeHtml(title || 'Notification')}</h2>
        <p style="margin:0 0 12px 0">${escapeHtml(message || '')}</p>
        ${meta.length ? `<div style="margin:12px 0">${meta.join('')}</div>` : ''}
        <div style="margin:18px 0">
          <a href="${url}"
             style="display:inline-block;background:${brandColor};color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;min-width:200px;text-align:center">
            Open in AdviSys
          </a>
        </div>
        <div style="border-top:1px solid ${borderColor};margin:18px 0"></div>
        <p style="font-size:12px;color:${mutedColor};margin:0">You can manage your notification preferences in your profile settings.</p>
      </div>
    </div>
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

    // Load user email and role
    const [[user]] = await db.query('SELECT email, role, full_name FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!user || !user.email) return null;

    const html = buildEmailHtml({ title, message, role: user.role, data });
    setImmediate(() => {
      sendEmail({ to: user.email, subject: title || 'Notification', html }).catch((emailErr) => {
        console.warn('Notification email send failed:', emailErr?.message || emailErr);
      });
    });
    return true;
  } catch (err) {
    const logFn = (process.env.NODE_ENV === 'test') ? console.warn : console.error;
    logFn('notify() failed:', err?.message || err);
    return null;
  }
}

module.exports = { notify, getNotificationSettings };
