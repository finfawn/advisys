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
let storageClient = null;
try {
  Storage = require('@google-cloud/storage').Storage;
  const keyPath = process.env.GCP_STORAGE_KEY_PATH;
  storageClient = Storage ? (keyPath ? new Storage({ keyFilename: keyPath }) : new Storage()) : null;
} catch (_) { Storage = null; storageClient = null; }
const { getPool } = require('../db/pool');

const router = express.Router();

// Optional Supabase Storage client (prefer when configured)
let supabase = null;
let supabaseBucket = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  supabaseBucket = process.env.SUPABASE_BUCKET || 'advisys-uploads';
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  }
} catch (_) {
  supabase = null;
}


// POST /api/uploads/avatar
// FormData: { avatar: File }
router.post(
  '/avatar',
  authMiddleware,
  // Wrap multer handler to return JSON error consistently when filter/storage fails
  (req, res, next) => {
    uploadAvatar.single('avatar')(req, res, (err) => {
      if (err) {
        const msg = err?.message || 'Failed to upload avatar';
        if (err?.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File too large (max 5MB)' });
        }
        if (/Only image files are allowed/i.test(msg)) {
          return res.status(415).json({ error: 'Unsupported media type. Only images are allowed.' });
        }
        return res.status(400).json({ error: msg });
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
          role = (uRow?.role || '').toLowerCase();
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
      const GCS_BUCKET_NAME = String(GCS_ENV_BUCKET_NAME || '').trim();
      if (supabase && supabaseBucket) {
        try {
          const userId2 = req.user?.id || 'anon';
          const ext2 = path.extname(req.file.originalname || '').toLowerCase();
          const safeExt2 = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext2) ? ext2 : '.png';
          const name2 = `avatar_${userId2}_${Date.now()}${safeExt2}`;
          const objectKey = `avatars/${name2}`;
          const { error: upErr } = await supabase
            .storage
            .from(supabaseBucket)
            .upload(objectKey, req.file.buffer, { contentType: req.file.mimetype || 'image/png', upsert: false });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from(supabaseBucket).getPublicUrl(objectKey);
          urlPath = pub?.publicUrl || null;
        } catch (sbErr) {
          console.error('Supabase upload failed:', sbErr);
        }
      } else if (storageClient && GCS_BUCKET_NAME) {
        try {
          const bucket = storageClient.bucket(GCS_BUCKET_NAME);
          const userId2 = req.user?.id || 'anon';
          const ext2 = path.extname(req.file.originalname || '').toLowerCase();
          const safeExt2 = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext2) ? ext2 : '.png';
          const name2 = `avatar_${userId2}_${Date.now()}${safeExt2}`;
          const gcsKey = `avatars/${name2}`;
          const file = bucket.file(gcsKey);
          await file.save(req.file.buffer, { contentType: req.file.mimetype || 'image/png', resumable: false, public: false });
          urlPath = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${gcsKey}`;
          let signedUrl = null;
          try {
            await file.makePublic();
          } catch (_) {
            try {
              const [signed] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 30 * 24 * 60 * 60 * 1000 });
              signedUrl = signed;
            } catch (_) {}
          }
        } catch (gcsErr) {
          console.error('GCS upload failed completely:', gcsErr);
        }
      }

      // Allow local fallback only when explicitly enabled (dev), otherwise prefer cloud URLs
      const isProd = String(process.env.NODE_ENV || 'production').toLowerCase() === 'production';
      const allowLocal = String(process.env.ALLOW_LOCAL_AVATAR_FALLBACK || (isProd ? 'false' : 'true')).toLowerCase() === 'true';
      if (!urlPath && allowLocal) {
        try {
          const userId3 = req.user?.id || 'anon';
          const ext3 = path.extname(req.file.originalname || '').toLowerCase();
          const safeExt3 = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext3) ? ext3 : '.png';
          const name3 = `avatar_${userId3}_${Date.now()}${safeExt3}`;
          const localPath = path.join(AVATARS_DIR, name3);
          fs.writeFileSync(localPath, req.file.buffer);
          urlPath = `/uploads/avatars/${name3}`;
        } catch (localErr) {
          console.error('Local avatar fallback failed:', localErr);
        }
      }

      // If no URL could be produced, return a clear error instead of saving null
      if (!urlPath) {
        return res.status(500).json({ error: 'Avatar storage not configured. Set GCS_BUCKET_NAME or enable ALLOW_LOCAL_AVATAR_FALLBACK=true.' });
      }

      // Persist avatar_url to DB for the authenticated user
      try {
        if (userId && role && urlPath) {
          if (role === 'student') {
            const [upd] = await pool.query('UPDATE student_profiles SET avatar_url = ? WHERE user_id = ?', [urlPath, userId]);
            if (upd.affectedRows === 0) {
              await pool.query('INSERT INTO student_profiles (user_id, avatar_url) VALUES (?, ?)', [userId, urlPath]);
            }
          } else if (role === 'advisor') {
            const [upd] = await pool.query('UPDATE advisor_profiles SET avatar_url = ? WHERE user_id = ?', [urlPath, userId]);
            if (upd.affectedRows === 0) {
              await pool.query('INSERT INTO advisor_profiles (user_id, avatar_url) VALUES (?, ?)', [userId, urlPath]);
            }
          }

          // After saving the new avatar URL, delete the previous asset if different and the new URL is valid
          if (urlPath && previousUrl && previousUrl !== urlPath) {
            try {
              const gcsMatch = previousUrl.match(/^https?:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/);
              const cdnMatch = CDN_BASE_URL ? previousUrl.replace(CDN_BASE_URL.replace(/\/$/, ''), '').match(/^\/(.+)$/) : null;
              if (gcsMatch && storageClient) {
                const [_, prevBucket, prevKey] = gcsMatch;
                try { await storageClient.bucket(prevBucket).file(prevKey).delete({ ignoreNotFound: true }); } catch (_) {}
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
