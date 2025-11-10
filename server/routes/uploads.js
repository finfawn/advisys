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

// Optional: Google Cloud Storage client
let Storage;
try {
  Storage = require('@google-cloud/storage').Storage;
} catch (_) {
  Storage = null;
}
const { getPool } = require('../db/pool');

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
router.post(
  '/avatar',
  authMiddleware,
  // Wrap multer handler to return JSON error consistently when filter/storage fails
  (req, res, next) => {
    uploadAvatar.single('avatar')(req, res, (err) => {
      if (err) {
        const message = err?.message || 'Failed to upload avatar';
        return res.status(500).json({ error: message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      // Default: local URL
      const relativePath = path.join('uploads', 'avatars', req.file.filename);
      let urlPath = `/${relativePath.replace(/\\/g, '/')}`; // Normalize for Windows

      // If GCS is configured, upload the local file to the bucket and prefer the public URL
      const { GCS_BUCKET_NAME, GCP_STORAGE_KEY_PATH } = process.env;
      if (Storage && GCS_BUCKET_NAME) {
        try {
          const storage = GCP_STORAGE_KEY_PATH ? new Storage({ keyFilename: GCP_STORAGE_KEY_PATH }) : new Storage();
          const bucket = storage.bucket(GCS_BUCKET_NAME);
          const gcsKey = `avatars/${req.file.filename}`;
          const localFilePath = path.join(AVATARS_DIR, req.file.filename);

          await bucket.upload(localFilePath, {
            destination: gcsKey,
            metadata: { contentType: req.file.mimetype || 'image/png' },
          });

          // Make the object publicly readable; alternatively generate signed URLs
          const file = bucket.file(gcsKey);
          try {
            await file.makePublic();
          } catch (_) {
            // If uniform bucket-level access is enabled, public ACLs may be disallowed.
            // In that case, consider using signed URLs or a CDN; for now, keep local URL.
          }

          // Prefer the public GCS URL if object is accessible
          urlPath = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${gcsKey}`;

          // Optional: remove local copy after successful upload
          try { fs.unlinkSync(localFilePath); } catch (_) {}
        } catch (gcsErr) {
          console.error('GCS upload failed; falling back to local URL:', gcsErr);
        }
      }

      // Persist avatar_url to DB for the authenticated user
      try {
        const pool = getPool();
        const userId = req.user?.id;
        if (userId) {
          const [[uRow]] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
          const role = uRow?.role;
          if (role === 'student') {
            await pool.query('UPDATE student_profiles SET avatar_url = ? WHERE user_id = ?', [urlPath, userId]);
          } else if (role === 'advisor') {
            await pool.query('UPDATE advisor_profiles SET avatar_url = ? WHERE user_id = ?', [urlPath, userId]);
          }
        }
      } catch (dbErr) {
        // Do not fail the upload due to DB issues; log for observability
        console.error('Avatar DB save failed:', dbErr);
      }

      return res.json({ url: urlPath });
    } catch (err) {
      console.error('Avatar upload failed:', err);
      return res.status(500).json({ error: 'Failed to upload avatar' });
    }
  }
);

module.exports = router;