const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { getPool } = require('../db/pool');
// AI summarization removed

// Google Cloud clients removed

const router = express.Router();
// Speech and Storage config from environment (Google only)
const {
  SPEECH_LANGUAGE_CODE,
  SPEECH_ALTERNATIVE_LANGUAGE_CODES,
  SPEECH_MODEL,
  GCS_BUCKET_NAME: GCS_ENV_BUCKET_NAME,
  GCS_TRANSCRIPTIONS_PREFIX,
  GCP_STORAGE_KEY_PATH,
  SPEECH_ENABLE_DIARIZATION,
  SPEECH_MIN_SPEAKERS,
  SPEECH_MAX_SPEAKERS,
} = process.env;
const GCS_BUCKET_NAME = GCS_ENV_BUCKET_NAME || 'advisys_bucket_backup';
// Allow disabling STT upload for local/dev environments
const DISABLE_STT_UPLOAD = String(process.env.DISABLE_STT_UPLOAD || '').toLowerCase() === 'true';
// Optional: retain uploaded audio in cloud storage (default: delete after STT completes)
const KEEP_RECORDINGS_AT_REST = String(process.env.KEEP_RECORDINGS_AT_REST || '').toLowerCase() === 'true';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB cap
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const RECORDINGS_DIR = path.join(UPLOADS_DIR, 'recordings');

function ensureRecordingDirs() {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
    if (!fs.existsSync(RECORDINGS_DIR)) fs.mkdirSync(RECORDINGS_DIR);
  } catch (err) {
    console.error('Failed to ensure recording directories:', err);
  }
}

function recordingExtensionForUpload(file) {
  const originalExt = String(path.extname(file?.originalname || '')).trim().toLowerCase();
  const allowedExts = new Set(['.webm', '.ogg', '.mp3', '.wav', '.m4a', '.mp4']);
  if (allowedExts.has(originalExt)) return originalExt;

  const mime = String(file?.mimetype || '').toLowerCase();
  if (mime.includes('ogg')) return '.ogg';
  if (mime.includes('mpeg') || mime.includes('mp3')) return '.mp3';
  if (mime.includes('wav')) return '.wav';
  if (mime.includes('mp4') || mime.includes('m4a')) return '.m4a';
  return '.webm';
}

async function ensureConsultationTranscriptColumns(pool) {
  try {
    const [cols1] = await pool.query('SHOW COLUMNS FROM consultations LIKE "final_transcript"');
    if (!cols1 || cols1.length === 0) {
      try { await pool.query('ALTER TABLE consultations ADD COLUMN final_transcript LONGTEXT NULL'); } catch (_) {}
    }
  } catch (_) {}
  // ai_summary column no longer managed
  try {
    const [cols3] = await pool.query('SHOW COLUMNS FROM consultations LIKE "recording_uri"');
    if (!cols3 || cols3.length === 0) {
      try { await pool.query('ALTER TABLE consultations ADD COLUMN recording_uri TEXT NULL'); } catch (_) {}
    }
  } catch (_) {}
}

// Helper: derive consultation id from meetingId like "advisys-<id>"
function consultationIdFromMeeting(meetingId) {
  if (!meetingId || typeof meetingId !== 'string') return null;
  const m = meetingId.match(/^advisys-(\d+)$/i);
  if (m) return Number(m[1]);
  return null;
}

function normalizeLang(code) {
  const c = String(code || '').trim().toLowerCase();
  if (!c) return 'en-US';
  return code;
}

function deriveGcsUri(uri) {
  const s = String(uri || '').trim();
  if (!s) return null;
  if (s.startsWith('gs://')) return s;
  const m = s.match(/^https:\/\/storage\.googleapis\.com\/(.+?)\/(.+)$/);
  if (m) return `gs://${m[1]}/${m[2].split('?')[0]}`;
  return null;
}

// POST /api/transcriptions
// Accepts real-time transcription entries from JAAS webhook or client bridge
router.post('/transcriptions', async (req, res) => {
  const pool = getPool();
  try {
    const {
      meetingId,
      advisorId,
      studentId,
      timestamp,
      text,
      speaker,
    } = req.body || {};

    if (!meetingId || !text || !timestamp) {
      return res.status(400).json({ error: 'meetingId, text, and timestamp are required' });
    }

    // Resolve consultation_id
    let consultationId = consultationIdFromMeeting(meetingId);
    if (!consultationId) {
      // Try lookup by room_name
      const [[row]] = await pool.query(
        'SELECT id FROM consultations WHERE room_name = ? LIMIT 1',
        [meetingId]
      );
      if (row) consultationId = row.id;
    }

    if (!consultationId) {
      return res.status(404).json({ error: 'Unable to resolve consultation for meetingId' });
    }

    const ts = new Date(timestamp);
    if (isNaN(ts.getTime())) {
      return res.status(400).json({ error: 'timestamp must be a valid ISO datetime' });
    }

    const [result] = await pool.query(
      `INSERT INTO transcriptions (consultation_id, meeting_id, advisor_user_id, student_user_id, speaker, text, timestamp)
       VALUES (?,?,?,?,?,?,?)`,
      [
        consultationId,
        meetingId,
        advisorId || null,
        studentId || null,
        speaker || null,
        text,
        ts,
      ]
    );

    return res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Transcriptions ingest error:', err);
    return res.status(500).json({ error: 'Failed to store transcription entry' });
  }
});

// POST /api/transcriptions/upload
router.post('/transcriptions/upload', upload.single('file'), async (req, res) => {
  const pool = getPool();
  try {
    const consultationId = Number(req.body?.consultationId || 0);

    if (!consultationId) {
      return res.status(400).json({ error: 'consultationId is required' });
    }

    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ error: 'No recording file uploaded' });
    }

    await ensureConsultationTranscriptColumns(pool);
    ensureRecordingDirs();

    const [[consultation]] = await pool.query(
      'SELECT id, recording_uri FROM consultations WHERE id = ? LIMIT 1',
      [consultationId]
    );

    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    const ext = recordingExtensionForUpload(req.file);
    const fileName = `consultation_${consultationId}_${Date.now()}${ext}`;
    const localPath = path.join(RECORDINGS_DIR, fileName);
    const publicPath = `/uploads/recordings/${fileName}`;

    fs.writeFileSync(localPath, req.file.buffer);

    await pool.query(
      'UPDATE consultations SET recording_uri = ? WHERE id = ?',
      [publicPath, consultationId]
    );

    const previousUrl = String(consultation.recording_uri || '').trim();
    if (previousUrl && previousUrl !== publicPath && previousUrl.startsWith('/uploads/recordings/')) {
      const previousPath = path.join(RECORDINGS_DIR, path.basename(previousUrl));
      try {
        if (fs.existsSync(previousPath)) fs.unlinkSync(previousPath);
      } catch (cleanupErr) {
        console.warn('Failed to remove previous recording:', cleanupErr);
      }
    }

    return res.json({ success: true, recordingUri: publicPath });
  } catch (err) {
    console.error('Transcriptions upload error:', err);
    return res.status(500).json({ error: 'Failed to save recording' });
  }
});

router.post('/transcriptions/reprocess/:id', async (req, res) => {
  return res.status(501).json({ error: 'Reprocess disabled' });
});

router.post('/transcriptions/reprocess-missing', async (req, res) => {
  return res.status(501).json({ error: 'Batch reprocess disabled' });
});

// POST /api/transcriptions/finalize
// Merge all entries for a meetingId and store in consultations.final_transcript
router.post('/transcriptions/finalize', async (req, res) => {
  const pool = getPool();
  try {
    const { meetingId } = req.body || {};
    if (!meetingId) {
      return res.status(400).json({ error: 'meetingId is required' });
    }

    let consultationId = consultationIdFromMeeting(meetingId);
    if (!consultationId) {
      const [[row]] = await pool.query(
        'SELECT id FROM consultations WHERE room_name = ? LIMIT 1',
        [meetingId]
      );
      if (row) consultationId = row.id;
    }

    if (!consultationId) {
      return res.status(404).json({ error: 'Unable to resolve consultation for meetingId' });
    }

    const [entries] = await pool.query(
      `SELECT speaker, text, timestamp FROM transcriptions
        WHERE meeting_id = ? AND consultation_id = ?
        ORDER BY timestamp ASC, id ASC`,
      [meetingId, consultationId]
    );

    if (!entries || entries.length === 0) {
      return res.json({ success: true, mergedLength: 0, summarized: false });
    }

    // Merge with optional speaker labels and timestamps
    const merged = entries
      .map(e => {
        const time = new Date(e.timestamp);
        const hh = String(time.getHours()).padStart(2, '0');
        const mm = String(time.getMinutes()).padStart(2, '0');
        const ss = String(time.getSeconds()).padStart(2, '0');
        const t = `${hh}:${mm}:${ss}`;
        const label = e.speaker ? e.speaker : 'Speaker';
        return `[${t}] ${label}: ${e.text}`;
      })
      .join('\n');

    try {
      await ensureConsultationTranscriptColumns(pool);
      await pool.query(
        'UPDATE consultations SET final_transcript = ? WHERE id = ?',
        [merged, consultationId]
      );
    } catch (_) {}

    return res.json({ success: true, mergedLength: merged.length, summarized: false });
  } catch (err) {
    console.error('Transcriptions finalize error:', err);
    return res.status(500).json({ error: 'Failed to finalize transcript' });
  }
});

module.exports = router;
