const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Ensure upload directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');
function ensureDirs() {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
    if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR);
  } catch (err) {
    console.error('Failed to ensure upload directories:', err);
  }
}
ensureDirs();

// Configure Multer storage for avatars
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDirs();
    cb(null, AVATARS_DIR);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || 'anon';
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext) ? ext : '.png';
    const name = `avatar_${userId}_${Date.now()}${safeExt}`;
    cb(null, name);
  },
});

function fileFilter(req, file, cb) {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed'));
}

const uploadAvatar = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5 MB

// POST /api/uploads/avatar
// FormData: { avatar: File }
router.post('/avatar', authMiddleware, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const relativePath = path.join('uploads', 'avatars', req.file.filename);
    const urlPath = `/${relativePath.replace(/\\/g, '/')}`; // Normalize for Windows
    return res.json({ url: urlPath });
  } catch (err) {
    console.error('Avatar upload failed:', err);
    return res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

module.exports = router;