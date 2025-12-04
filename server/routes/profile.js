const express = require('express');
const { getPool } = require('../db/pool');
const fs = require('fs');
const path = require('path');
let Storage;
let storageClient = null;
try {
  Storage = require('@google-cloud/storage').Storage;
  const keyPath = process.env.GCP_STORAGE_KEY_PATH;
  storageClient = Storage ? (keyPath ? new Storage({ keyFilename: keyPath }) : new Storage()) : null;
} catch (_) { Storage = null; storageClient = null; }
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/profile/me
router.get('/me', authMiddleware, async (req, res) => {
  const pool = getPool();
  const userId = req.user?.id;
  try {
    const [uRows] = await pool.query('SELECT id, role, email, full_name FROM users WHERE id = ?', [userId]);
    if (!uRows.length) return res.status(404).json({ error: 'User not found' });
    const u = uRows[0];
    const result = { id: u.id, role: u.role, email: u.email, full_name: u.full_name };
    if (u.role === 'student') {
      const [sRows] = await pool.query('SELECT program, year_level, avatar_url FROM student_profiles WHERE user_id = ?', [userId]);
      if (sRows.length) Object.assign(result, sRows[0]);
    } else if (u.role === 'advisor') {
      const [aRows] = await pool.query('SELECT department, title, avatar_url, office_location FROM advisor_profiles WHERE user_id = ?', [userId]);
      if (aRows.length) Object.assign(result, aRows[0]);
    }
    return res.json(result);
  } catch (err) {
    console.error('Profile fetch failed:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PATCH /api/profile/me
// Body may include: full_name (or firstName+lastName), email, program, year_level, department, title, avatar_url
router.patch('/me', authMiddleware, async (req, res) => {
  const pool = getPool();
  const userId = req.user?.id;
  const body = req.body || {};
  try {
    // Update users table
    let fullName = body.full_name;
    if (!fullName && body.firstName && body.lastName) {
      fullName = `${String(body.firstName).trim()} ${String(body.lastName).trim()}`;
    }
    if (fullName || body.email) {
      const fields = [];
      const values = [];
      if (fullName) { fields.push('full_name = ?'); values.push(fullName); }
      if (body.email) { fields.push('email = ?'); values.push(body.email); }
      if (fields.length) {
        values.push(userId);
        await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      }
    }

    // Update role-specific profile
    const [uRows] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!uRows.length) return res.status(404).json({ error: 'User not found' });
    const role = uRows[0].role;
    let previousAvatarUrl = null;
    const willChangeAvatar = body.avatar_url !== undefined;
    if (willChangeAvatar) {
      try {
        if (role === 'student') {
          const [[row]] = await pool.query('SELECT avatar_url FROM student_profiles WHERE user_id = ?', [userId]);
          previousAvatarUrl = row?.avatar_url || null;
        } else if (role === 'advisor') {
          const [[row]] = await pool.query('SELECT avatar_url FROM advisor_profiles WHERE user_id = ?', [userId]);
          previousAvatarUrl = row?.avatar_url || null;
        }
      } catch (prevErr) {
        console.error('Failed to read previous avatar_url before update:', prevErr);
      }
    }
    const { CDN_BASE_URL, NODE_ENV } = process.env;
    const isProd = String(NODE_ENV || '').toLowerCase() === 'production';
    const sanitizeAvatarUrl = (u) => {
      const s = String(u || '').trim();
      if (!s) return null;
      if (/^blob:/i.test(s) || /^data:/i.test(s)) return null;
      if (isProd && (/^https?:\/\/[^/]+\/uploads\/avatars\//i.test(s) || s.startsWith('/uploads/avatars/'))) return null;
      if (/^https?:\/\//i.test(s)) return s;
      if (CDN_BASE_URL && s.startsWith(String(CDN_BASE_URL).replace(/\/$/, ''))) return s;
      if (s.startsWith('/uploads/')) return s;
      return null;
    };

    if (role === 'student') {
      const fields = [];
      const values = [];
      if (body.program !== undefined) { fields.push('program = ?'); values.push(body.program || null); }
      if (body.year_level !== undefined || body.yearLevel !== undefined) {
        const yr = body.year_level ?? body.yearLevel;
        fields.push('year_level = ?'); values.push(yr ? String(yr) : null);
      }
      if (body.avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(sanitizeAvatarUrl(body.avatar_url)); }
      if (fields.length) {
        values.push(userId);
        const [upd] = await pool.query(`UPDATE student_profiles SET ${fields.join(', ')} WHERE user_id = ?`, values);
        if (upd.affectedRows === 0) {
          const insertFields = ['user_id'];
          const insertValues = [userId];
          if (body.program !== undefined) { insertFields.push('program'); insertValues.push(body.program || null); }
          if (body.year_level !== undefined || body.yearLevel !== undefined) { insertFields.push('year_level'); insertValues.push((body.year_level ?? body.yearLevel) ? String(body.year_level ?? body.yearLevel) : null); }
          if (body.avatar_url !== undefined) { insertFields.push('avatar_url'); insertValues.push(sanitizeAvatarUrl(body.avatar_url)); }
          await pool.query(`INSERT INTO student_profiles (${insertFields.join(', ')}) VALUES (${insertFields.map(() => '?').join(', ')})`, insertValues);
        }
      }
    } else if (role === 'advisor') {
      const fields = [];
      const values = [];
      if (body.department !== undefined) { fields.push('department = ?'); values.push(body.department || null); }
      if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title || null); }
      if (body.avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(sanitizeAvatarUrl(body.avatar_url)); }
      if (body.office_location !== undefined || body.officeLocation !== undefined) {
        const ol = body.office_location ?? body.officeLocation;
        // Debug: log advisor office_location update intent
        console.log('[Profile] Advisor update', {
          userId,
          department: body.department,
          title: body.title,
          avatar_url: body.avatar_url,
          office_location: ol
        });
        fields.push('office_location = ?'); values.push(ol || null);
      }
      if (fields.length) {
        values.push(userId);
        const [upd] = await pool.query(`UPDATE advisor_profiles SET ${fields.join(', ')} WHERE user_id = ?`, values);
        if (upd.affectedRows === 0) {
          const insertFields = ['user_id'];
          const insertValues = [userId];
          if (body.department !== undefined) { insertFields.push('department'); insertValues.push(body.department || null); }
          if (body.title !== undefined) { insertFields.push('title'); insertValues.push(body.title || null); }
          if (body.avatar_url !== undefined) { insertFields.push('avatar_url'); insertValues.push(sanitizeAvatarUrl(body.avatar_url)); }
          if (body.office_location !== undefined || body.officeLocation !== undefined) { insertFields.push('office_location'); insertValues.push((body.office_location ?? body.officeLocation) || null); }
          await pool.query(`INSERT INTO advisor_profiles (${insertFields.join(', ')}) VALUES (${insertFields.map(() => '?').join(', ')})`, insertValues);
        }
      }
    }

    // After saving, if avatar_url changed, delete the previous asset
    try {
      if (willChangeAvatar && previousAvatarUrl && previousAvatarUrl !== (body.avatar_url || null)) {
        const { CDN_BASE_URL } = process.env;
        const gcsMatch = previousAvatarUrl.match(/^https?:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/);
        const cdnMatch = CDN_BASE_URL ? previousAvatarUrl.replace(CDN_BASE_URL.replace(/\/$/, ''), '').match(/^\/(.+)$/) : null;
        if (gcsMatch && storageClient) {
          const [_, prevBucket, prevKey] = gcsMatch;
          try {
            await storageClient.bucket(prevBucket).file(prevKey).delete({ ignoreNotFound: true });
          } catch (_) {}
        } else if (previousAvatarUrl.startsWith('/uploads/avatars/')) {
          const AVATARS_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
          const prevName = path.basename(previousAvatarUrl);
          const prevLocal = path.join(AVATARS_DIR, prevName);
          try { fs.unlinkSync(prevLocal); } catch (_) {}
        }
      }
    } catch (delErr) {
      console.error('Failed to delete previous avatar asset after profile update:', delErr);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Profile update failed:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
// DELETE /api/profile/me
router.delete('/me', authMiddleware, async (req, res) => {
  const pool = getPool();
  const userId = req.user?.id;
  try {
    let avatarUrls = [];
    try {
      const [[sp]] = await pool.query('SELECT avatar_url FROM student_profiles WHERE user_id = ? LIMIT 1', [userId]);
      const [[ap]] = await pool.query('SELECT avatar_url FROM advisor_profiles WHERE user_id = ? LIMIT 1', [userId]);
      const sUrl = sp?.avatar_url || null;
      const aUrl = ap?.avatar_url || null;
      avatarUrls = [sUrl, aUrl].filter(Boolean);
    } catch (_) {}
    await pool.query('UPDATE users SET status = ? WHERE id = ?', ['inactive', userId]);
    try { await pool.query('DELETE FROM student_profiles WHERE user_id = ?', [userId]); } catch (_) {}
    try { await pool.query('DELETE FROM advisor_profiles WHERE user_id = ?', [userId]); } catch (_) {}
    try { await pool.query('DELETE FROM notifications WHERE user_id = ?', [userId]); } catch (_) {}
    try { await pool.query('DELETE FROM consultations WHERE student_id = ? OR advisor_id = ?', [userId, userId]); } catch (_) {}
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });

    try {
      for (const u of avatarUrls) {
        const gcsMatch = u.match(/^https?:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/);
        if (gcsMatch && storageClient) {
          const [_, bucket, key] = gcsMatch;
          try { await storageClient.bucket(bucket).file(key).delete({ ignoreNotFound: true }); } catch (_) {}
        } else if (u.startsWith('/uploads/avatars/')) {
          const AVATARS_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
          const name = path.basename(u);
          const local = path.join(AVATARS_DIR, name);
          try { fs.unlinkSync(local); } catch (_) {}
        }
      }
    } catch (e) {
      console.error('Failed to delete avatar assets on account deletion:', e);
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete account failed:', err);
    return res.status(500).json({ error: 'Delete account failed' });
  }
});
