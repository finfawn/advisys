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

let Storage;
try { Storage = require('@google-cloud/storage').Storage; } catch (_) { Storage = null; }
let S3Client, PutObjectCommand, DeleteObjectCommand;
try {
  ({ S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3'));
} catch (_) {}
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

      // Default: local URL
      const relativePath = path.join('uploads', 'avatars', req.file.filename);
      let urlPath = `/${relativePath.replace(/\\/g, '/')}`; // Normalize for Windows

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

      const { GCS_BUCKET_NAME, GCP_STORAGE_KEY_PATH, S3_UPLOADS_BUCKET, AWS_REGION, CDN_BASE_URL } = process.env;
      if (Storage && GCS_BUCKET_NAME) {
        try {
          const storage = GCP_STORAGE_KEY_PATH ? new Storage({ keyFilename: GCP_STORAGE_KEY_PATH }) : new Storage();
          const bucket = storage.bucket(GCS_BUCKET_NAME);
          const gcsKey = `avatars/${req.file.filename}`;
          const localFilePath = path.join(AVATARS_DIR, req.file.filename);
          await bucket.upload(localFilePath, { destination: gcsKey, metadata: { contentType: req.file.mimetype || 'image/png' } });
          try { fs.unlinkSync(localFilePath); } catch (_) {}
          urlPath = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${gcsKey}`;
        } catch (gcsErr) {
          console.error('GCS upload failed; falling back to local URL:', gcsErr);
        }
      } else if (S3Client && S3_UPLOADS_BUCKET) {
        try {
          const s3 = new S3Client({ region: AWS_REGION || 'us-east-1' });
          const key = `avatars/${req.file.filename}`;
          const localFilePath = path.join(AVATARS_DIR, req.file.filename);
          const body = fs.readFileSync(localFilePath);
          await s3.send(new PutObjectCommand({ Bucket: S3_UPLOADS_BUCKET, Key: key, Body: body, ContentType: req.file.mimetype || 'image/png', ACL: 'public-read' }));
          try { fs.unlinkSync(localFilePath); } catch (_) {}
          if (CDN_BASE_URL) {
            urlPath = `${CDN_BASE_URL.replace(/\/$/, '')}/${key}`;
          } else {
            urlPath = `https://${S3_UPLOADS_BUCKET}.s3.amazonaws.com/${key}`;
          }
        } catch (s3Err) {
          console.error('S3 upload failed; falling back to local URL:', s3Err);
        }
      }

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
              const s3Match = previousUrl.match(/^https?:\/\/([^.]+)\.s3[.-][^/]+\.amazonaws\.com\/(.+)$/);
              const cdnMatch = CDN_BASE_URL ? previousUrl.replace(CDN_BASE_URL.replace(/\/$/, ''), '').match(/^\/(.+)$/) : null;
              if (s3Match && S3Client && S3_UPLOADS_BUCKET) {
                try {
                  const s3 = new S3Client({ region: AWS_REGION || 'us-east-1' });
                  const key = s3Match[2];
                  await s3.send(new DeleteObjectCommand({ Bucket: S3_UPLOADS_BUCKET, Key: key }));
                } catch (_) {}
              } else if (cdnMatch && S3Client && S3_UPLOADS_BUCKET) {
                try {
                  const s3 = new S3Client({ region: AWS_REGION || 'us-east-1' });
                  const key = cdnMatch[1];
                  await s3.send(new DeleteObjectCommand({ Bucket: S3_UPLOADS_BUCKET, Key: key }));
                } catch (_) {}
              } else if (gcsMatch && Storage) {
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