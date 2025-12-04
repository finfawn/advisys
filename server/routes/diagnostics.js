const express = require('express');
const https = require('https');
let Storage;
let SpeechClient;
try { ({ Storage } = require('@google-cloud/storage')); } catch (_) {}
try { ({ SpeechClient } = require('@google-cloud/speech')); } catch (_) {}

const router = express.Router();

router.get('/email', async (req, res) => {
  const MAILJET_API_KEY = (process.env.MAILJET_API_KEY || '').trim();
  const MAILJET_API_SECRET = (process.env.MAILJET_API_SECRET || '').trim();
  const MAIL_FROM = (process.env.MAIL_FROM || '').trim();

  const envOk = Boolean(MAILJET_API_KEY && MAILJET_API_SECRET && MAIL_FROM);

  function checkHttps(hostname) {
    return new Promise((resolve) => {
      const req = https.request({ hostname, method: 'HEAD', path: '/', timeout: 8000 }, (r) => {
        resolve({ ok: true, statusCode: r.statusCode || 0 });
      });
      req.on('timeout', () => {
        req.destroy(new Error('timeout'));
      });
      req.on('error', (e) => {
        resolve({ ok: false, error: e.message || String(e) });
      });
      req.end();
    });
  }

  const net = await checkHttps('api.mailjet.com');
  return res.json({ envOk, net });
});

module.exports = router;

// --- Extended diagnostics for AI/Storage/Speech pipeline ---
router.get('/storage', async (req, res) => {
  try {
    const bucketName = process.env.GCS_BUCKET_NAME || 'advisys_bucket_backup';
    if (!Storage) return res.status(500).json({ ok: false, error: 'Storage SDK not available' });
    const storage = new Storage();
    const bucket = storage.bucket(bucketName);
    let exists = false;
    try {
      const [ex] = await bucket.exists();
      exists = !!ex;
    } catch (e) {
      return res.status(200).json({ ok: false, bucket: bucketName, error: e?.message || String(e) });
    }
    return res.json({ ok: true, bucket: bucketName, exists });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

router.get('/speech', async (req, res) => {
  try {
    if (!SpeechClient) return res.status(500).json({ ok: false, error: 'Speech SDK not available' });
    const client = new SpeechClient();
    try {
      const projectId = await client.getProjectId();
      return res.json({ ok: true, projectId });
    } catch (e) {
      return res.status(200).json({ ok: false, error: e?.message || String(e) });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const enabled = String(process.env.AI_SUMMARY_ENABLED || '').toLowerCase() === 'true';
    const key = (process.env.AI_SUMMARY_API_KEY || '').trim();
    const model = (process.env.AI_SUMMARY_MODEL || 'gemini-2.5-flash').trim();
    if (!enabled) return res.json({ ok: false, enabled, error: 'AI summaries disabled' });
    if (!key) return res.json({ ok: false, enabled, error: 'AI_SUMMARY_API_KEY not set' });
    const urls = [
      `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(key)}`,
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    ];
    const out = [];
    for (const url of urls) {
      try {
        const r = await fetch(url);
        const data = await r.json().catch(() => ({}));
        out.push({ endpoint: url, ok: r.ok, count: (data?.models || []).length });
      } catch (e) {
        out.push({ endpoint: url, ok: false, error: e?.message || String(e) });
      }
    }
    return res.json({ ok: true, enabled, model, endpoints: out });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

router.get('/pipeline', async (req, res) => {
  try {
    const bucketName = process.env.GCS_BUCKET_NAME || 'advisys_bucket_backup';
    const sttDisabled = String(process.env.DISABLE_STT_UPLOAD || '').toLowerCase() === 'true';
    const enabledAI = String(process.env.AI_SUMMARY_ENABLED || '').toLowerCase() === 'true';
    const aiKeySet = !!(process.env.AI_SUMMARY_API_KEY || '').trim();

    let storageOk = false, storageExists = false;
    if (Storage) {
      try {
        const storage = new Storage();
        const bucket = storage.bucket(bucketName);
        const [ex] = await bucket.exists();
        storageOk = true; storageExists = !!ex;
      } catch (_) {}
    }

    let speechOk = false, projectId = null;
    if (SpeechClient) {
      try {
        const client = new SpeechClient();
        projectId = await client.getProjectId();
        speechOk = true;
      } catch (_) {}
    }

    return res.json({
      ok: true,
      storage: { sdk: !!Storage, bucket: bucketName, exists: storageExists, ok: storageOk },
      speech: { sdk: !!SpeechClient, projectId, ok: speechOk },
      ai: { enabled: enabledAI, keySet: aiKeySet },
      flags: { DISABLE_STT_UPLOAD: sttDisabled }
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});
