const express = require('express');
const { getPool } = require('../db/pool');
const fs = require('fs');
const path = require('path');
let Storage;
try { Storage = require('@google-cloud/storage').Storage; } catch (_) { Storage = null; }
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
    if (role === 'student') {
      const fields = [];
      const values = [];
      if (body.program !== undefined) { fields.push('program = ?'); values.push(body.program || null); }
      if (body.year_level !== undefined || body.yearLevel !== undefined) {
        const yr = body.year_level ?? body.yearLevel;
        fields.push('year_level = ?'); values.push(yr ? String(yr) : null);
      }
      if (body.avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(body.avatar_url || null); }
      if (fields.length) {
        values.push(userId);
        await pool.query(`UPDATE student_profiles SET ${fields.join(', ')} WHERE user_id = ?`, values);
      }
    } else if (role === 'advisor') {
      const fields = [];
      const values = [];
      if (body.department !== undefined) { fields.push('department = ?'); values.push(body.department || null); }
      if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title || null); }
      if (body.avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(body.avatar_url || null); }
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
        await pool.query(`UPDATE advisor_profiles SET ${fields.join(', ')} WHERE user_id = ?`, values);
      }
    }

    // After saving, if avatar_url changed, delete the previous asset
    try {
      if (willChangeAvatar && previousAvatarUrl && previousAvatarUrl !== (body.avatar_url || null)) {
        const { GCP_STORAGE_KEY_PATH, CDN_BASE_URL } = process.env;
        const gcsMatch = previousAvatarUrl.match(/^https?:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/);
        const cdnMatch = CDN_BASE_URL ? previousAvatarUrl.replace(CDN_BASE_URL.replace(/\/$/, ''), '').match(/^\/(.+)$/) : null;
        if (gcsMatch && Storage) {
          const [_, prevBucket, prevKey] = gcsMatch;
          const storage = GCP_STORAGE_KEY_PATH ? new Storage({ keyFilename: GCP_STORAGE_KEY_PATH }) : new Storage();
          await storage.bucket(prevBucket).file(prevKey).delete({ ignoreNotFound: true });
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
    await pool.query('UPDATE users SET status = ? WHERE id = ?', ['inactive', userId]);
    try { await pool.query('DELETE FROM student_profiles WHERE user_id = ?', [userId]); } catch (_) {}
    try { await pool.query('DELETE FROM advisor_profiles WHERE user_id = ?', [userId]); } catch (_) {}
    try { await pool.query('DELETE FROM notifications WHERE user_id = ?', [userId]); } catch (_) {}
    try { await pool.query('DELETE FROM consultations WHERE student_id = ? OR advisor_id = ?', [userId, userId]); } catch (_) {}
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete account failed:', err);
    return res.status(500).json({ error: 'Delete account failed' });
  }
});
