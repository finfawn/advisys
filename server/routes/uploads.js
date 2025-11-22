const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');



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

// Configure Multer storage for avatars (memory)
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed'));
}

const uploadAvatar = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5 MB

let Storage;
try { Storage = require('@google-cloud/storage').Storage; } catch (_) { Storage = null; }
const { getPool } = require('../db/pool');

const router = express.Router();


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

      let urlPath = null;

      // Fetch existing avatar for the user so we can clean it up later
      const pool = getPool();
      const userId = req.user?.id;
      let role = null;
      let previousUrl = null;
      try {
        if (userId) {
          const [[uRow]] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
          role = uRow?.role || null;
          if (role === 'student') {
            const [[row]] = await pool.query('SELECT avatar_url FROM student_profiles WHERE user_id = ?', [userId]);
            previousUrl = row?.avatar_url || null;
          } else if (role === 'advisor') {
            const [[row]] = await pool.query('SELECT avatar_url FROM advisor_profiles WHERE user_id = ?', [userId]);
            previousUrl = row?.avatar_url || null;
          }
        }
      } catch (prevErr) {
        console.error('Failed to read previous avatar_url:', prevErr);
      }

      const { GCS_BUCKET_NAME: GCS_ENV_BUCKET_NAME, GCP_STORAGE_KEY_PATH, CDN_BASE_URL, ALLOW_LOCAL_AVATAR_FALLBACK } = process.env;
      const GCS_BUCKET_NAME = GCS_ENV_BUCKET_NAME || 'advisys_bucket_backup';
      if (Storage && GCS_BUCKET_NAME) {
        try {
          const storage = GCP_STORAGE_KEY_PATH ? new Storage({ keyFilename: GCP_STORAGE_KEY_PATH }) : new Storage();
          const bucket = storage.bucket(GCS_BUCKET_NAME);
          const userId2 = req.user?.id || 'anon';
          const ext2 = path.extname(req.file.originalname || '').toLowerCase();
          const safeExt2 = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext2) ? ext2 : '.png';
          const name2 = `avatar_${userId2}_${Date.now()}${safeExt2}`;
          const gcsKey = `avatars/${name2}`;
          await bucket.file(gcsKey).save(req.file.buffer, { contentType: req.file.mimetype || 'image/png', resumable: false, public: false });
          try {
            await bucket.file(gcsKey).makePublic();
            urlPath = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${gcsKey}`;
          } catch (_) {
            try {
              const [signed] = await bucket.file(gcsKey).getSignedUrl({ action: 'read', expires: Date.now() + 30 * 24 * 60 * 60 * 1000 });
              urlPath = signed;
            } catch (_) {
              urlPath = null;
            }
          }
        } catch (gcsErr) {
          console.error('GCS upload failed; falling back to local URL:', gcsErr);
        }
      }

      // Allow local fallback when cloud URL is unavailable

      // Persist avatar_url to DB for the authenticated user
      try {
        if (userId && role) {
          if (role === 'student') {
            await pool.query('UPDATE student_profiles SET avatar_url = ? WHERE user_id = ?', [urlPath, userId]);
          } else if (role === 'advisor') {
            await pool.query('UPDATE advisor_profiles SET avatar_url = ? WHERE user_id = ?', [urlPath, userId]);
          }

          // After saving the new avatar URL, delete the previous asset if different
          if (previousUrl && previousUrl !== urlPath) {
            try {
              const gcsMatch = previousUrl.match(/^https?:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/);
              const cdnMatch = CDN_BASE_URL ? previousUrl.replace(CDN_BASE_URL.replace(/\/$/, ''), '').match(/^\/(.+)$/) : null;
              if (gcsMatch && Storage) {
                const [_, prevBucket, prevKey] = gcsMatch;
                const storage = GCP_STORAGE_KEY_PATH ? new Storage({ keyFilename: GCP_STORAGE_KEY_PATH }) : new Storage();
                await storage.bucket(prevBucket).file(prevKey).delete({ ignoreNotFound: true });
              } else if (previousUrl.startsWith('/uploads/avatars/')) {
                // If previous was local, remove the file from avatars dir
                const prevName = path.basename(previousUrl);
                const prevLocal = path.join(AVATARS_DIR, prevName);
                try { fs.unlinkSync(prevLocal); } catch (_) {}
              }
            } catch (delErr) {
              console.error('Failed to delete previous avatar asset:', delErr);
            }
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
