const express = require('express');
const multer = require('multer');
const { getPool } = require('../db/pool');
const { summarizeConsultation } = require('../services/ai');

let SpeechClient;
let Storage;
try { ({ SpeechClient } = require('@google-cloud/speech')); } catch (_) {}
try { ({ Storage } = require('@google-cloud/storage')); } catch (_) {}

const router = express.Router();
// Speech and Storage config from environment (Google only)
const {
  SPEECH_LANGUAGE_CODE,
  SPEECH_ALTERNATIVE_LANGUAGE_CODES,
  SPEECH_MODEL,
  GCS_BUCKET_NAME: GCS_ENV_BUCKET_NAME,
  GCS_TRANSCRIPTIONS_PREFIX,
  GCP_STORAGE_KEY_PATH,
} = process.env;
const GCS_BUCKET_NAME = GCS_ENV_BUCKET_NAME || 'advisys_bucket_backup';
// Allow disabling STT upload for local/dev environments
const DISABLE_STT_UPLOAD = String(process.env.DISABLE_STT_UPLOAD || '').toLowerCase() === 'true';
// Optional: retain uploaded audio in cloud storage (default: delete after STT completes)
const KEEP_RECORDINGS_AT_REST = String(process.env.KEEP_RECORDINGS_AT_REST || '').toLowerCase() === 'true';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB cap

async function ensureConsultationTranscriptColumns(pool) {
  try {
    const [cols1] = await pool.query('SHOW COLUMNS FROM consultations LIKE "final_transcript"');
    if (!cols1 || cols1.length === 0) {
      try { await pool.query('ALTER TABLE consultations ADD COLUMN final_transcript LONGTEXT NULL'); } catch (_) {}
    }
  } catch (_) {}
  try {
    const [cols2] = await pool.query('SHOW COLUMNS FROM consultations LIKE "ai_summary"');
    if (!cols2 || cols2.length === 0) {
      try { await pool.query('ALTER TABLE consultations ADD COLUMN ai_summary LONGTEXT NULL'); } catch (_) {}
    }
  } catch (_) {}
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
    const file = req.file;
    const consultationIdRaw = req.body?.consultationId;
    let languageCode = req.body?.languageCode || SPEECH_LANGUAGE_CODE || 'en-US';
    if (String(languageCode).toLowerCase() === 'fil-ph') languageCode = 'tl-PH';
    if (!file) return res.status(400).json({ error: 'Missing audio file' });
    const consultationId = Number(consultationIdRaw);
    if (!consultationId) return res.status(400).json({ error: 'Missing or invalid consultationId' });

    if (DISABLE_STT_UPLOAD) {
      try {
        await pool.query('UPDATE consultations SET final_transcript = ? WHERE id = ?', [null, consultationId]);
      } catch (_) {}
      return res.json({ success: true, transcriptLength: 0, summarized: false, bypassed: true });
    }

    if (!SpeechClient) {
      return res.status(500).json({ error: 'Google Speech-to-Text not available on server' });
    }

    // Read consultation metadata for better summarization context
    const [[cRow]] = await pool.query(
      `SELECT c.*, s.full_name AS student_name, a.full_name AS advisor_name
         FROM consultations c
         JOIN users s ON s.id = c.student_user_id
         JOIN users a ON a.id = c.advisor_user_id
        WHERE c.id = ?`, [consultationId]
    );
    if (!cRow) return res.status(404).json({ error: 'Consultation not found' });

    const filename = req.file?.originalname || '';
    const lower = filename.toLowerCase();
    const mime = req.file?.mimetype || '';
    const ext = lower.endsWith('.ogg') ? 'ogg' : lower.endsWith('.mp3') ? 'mp3' : lower.endsWith('.wav') ? 'wav' : lower.endsWith('.mp4') ? 'mp4' : lower.endsWith('.webm') ? 'webm' : 'webm';
    let merged = '';
    let recordingUri = null;

    const client = GCP_STORAGE_KEY_PATH ? new SpeechClient({ keyFilename: GCP_STORAGE_KEY_PATH }) : new SpeechClient();
    const bytes = file.buffer.toString('base64');
    const altRaw = String(SPEECH_ALTERNATIVE_LANGUAGE_CODES || '').trim();
    const alternativeLanguageCodes = altRaw ? altRaw.split(',').map(s => s.trim()).filter(Boolean).map(c => (c.toLowerCase() === 'fil-ph' ? 'tl-PH' : c)) : [];
    function encodingForExt(e) {
      const m = String(e || '').toLowerCase();
      if (m === 'webm') return 'WEBM_OPUS';
      if (m === 'ogg') return 'OGG_OPUS';
      if (m === 'mp3') return 'MP3';
      if (m === 'wav') return 'LINEAR16';
      return undefined;
    }
    const cfg = {
      languageCode,
      enableAutomaticPunctuation: true,
    };
    const enc = encodingForExt(ext);
    if (enc) cfg.encoding = enc;
    if (SPEECH_MODEL) cfg.model = SPEECH_MODEL;
    if (alternativeLanguageCodes.length) cfg.alternativeLanguageCodes = alternativeLanguageCodes;
    const [operation] = await client.longRunningRecognize({
      audio: { content: bytes },
      config: cfg,
    });
    const [response] = await operation.promise();
    merged = Array.isArray(response?.results) ? response.results.map(r => r.alternatives?.[0]?.transcript || '').filter(Boolean).join('\n') : '';
    if (KEEP_RECORDINGS_AT_REST && Storage && GCS_BUCKET_NAME) {
      try {
        const storage = GCP_STORAGE_KEY_PATH ? new Storage({ keyFilename: GCP_STORAGE_KEY_PATH }) : new Storage();
        const bucket = storage.bucket(GCS_BUCKET_NAME);
        const prefix = (GCS_TRANSCRIPTIONS_PREFIX || 'consultations').replace(/\/$/, '');
        const key = `${prefix}/${consultationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        await bucket.file(key).save(file.buffer, { contentType: mime || 'audio/webm', resumable: false, public: false });
        try {
          await bucket.file(key).makePublic();
          recordingUri = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${key}`;
        } catch (_) {
          try {
            const [signed] = await bucket.file(key).getSignedUrl({ action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
            recordingUri = signed;
          } catch (_) {
            recordingUri = `gs://${GCS_BUCKET_NAME}/${key}`;
          }
        }
        try { await pool.query('UPDATE consultations SET recording_uri = ? WHERE id = ?', [recordingUri, consultationId]); } catch (_) {}
      } catch (_) {}
    }

    // Persist transcript (no audio retained at rest)
    try {
      await ensureConsultationTranscriptColumns(pool);
      await pool.query('UPDATE consultations SET final_transcript = ? WHERE id = ?', [merged || null, consultationId]);
    } catch (e) {
      // Ignore if column missing or write fails
    }

    // Generate AI summary if available
    let summary = null;
    if (merged && merged.length > 0) {
      try {
        summary = await summarizeConsultation(
          merged,
          cRow?.topic || null,
          cRow?.advisor_name || null,
          cRow?.student_name || null
        );
        if (summary && typeof summary === 'string') {
          try {
            await ensureConsultationTranscriptColumns(pool);
            await pool.query('UPDATE consultations SET ai_summary = ? WHERE id = ?', [summary, consultationId]);
          } catch (dbErr) {
            if (String(dbErr?.code) !== 'ER_BAD_FIELD_ERROR') {
              console.warn('Failed to store AI summary (upload route):', dbErr);
            }
          }
        }
      } catch (aiErr) {
        console.warn('Summarization error:', aiErr);
      }
    }

    return res.json({ success: true, transcriptLength: merged.length || 0, summarized: Boolean(summary), provider: 'google', recordingUri });
  } catch (err) {
    console.error('Transcriptions upload error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to process uploaded audio', details: err?.message || String(err) });
  }
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

    // If there are no transcript entries, optionally skip AI summarization entirely
    // Controlled by AI_SUMMARY_REQUIRE_TRANSCRIPT (default: true)
    const REQUIRE_TRANSCRIPT = String(process.env.AI_SUMMARY_REQUIRE_TRANSCRIPT || 'true').toLowerCase() === 'true';
    // If no transcript and summaries require transcript, do not call AI
    if (!entries || entries.length === 0) {
      if (REQUIRE_TRANSCRIPT) {
        return res.json({ success: true, mergedLength: 0, summarized: false });
      }
      // Otherwise, attempt a fallback summary using existing notes
      try {
        const [[c]] = await pool.query(
          `SELECT c.*, s.full_name AS student_name, a.full_name AS advisor_name
           FROM consultations c
           JOIN users s ON s.id = c.student_user_id
           JOIN users a ON a.id = c.advisor_user_id
           WHERE c.id = ?`, [consultationId]
        );

        // Prefer advisor-provided summary notes; fall back to student notes
        const notesText = [c?.summary_notes, c?.student_notes]
          .map(v => (typeof v === 'string' ? v.trim() : ''))
          .filter(Boolean)
          .join('\n\n');

        let summary = null;
        if (notesText) {
          summary = await summarizeConsultation(
            notesText,
            c?.topic || null,
            c?.advisor_name || null,
            c?.student_name || null
          );
          if (summary && typeof summary === 'string') {
            try {
              await pool.query('UPDATE consultations SET ai_summary = ? WHERE id = ?', [summary, consultationId]);
            } catch (dbErr) {
              if (String(dbErr?.code) !== 'ER_BAD_FIELD_ERROR') {
                console.warn('Failed to store AI summary (fallback):', dbErr);
              }
            }
          }
        }

        // Even with no transcript, return best-effort status
        return res.json({ success: true, mergedLength: 0, summarized: Boolean(summary) });
      } catch (fallbackErr) {
        console.warn('Fallback summarization error:', fallbackErr);
        return res.json({ success: true, mergedLength: 0, summarized: false });
      }
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

    // Attempt AI summarization (best-effort; does not block success)
    let summary = null;
    try {
      const [[c]] = await pool.query(
        `SELECT c.*, s.full_name AS student_name, a.full_name AS advisor_name
         FROM consultations c
         JOIN users s ON s.id = c.student_user_id
         JOIN users a ON a.id = c.advisor_user_id
         WHERE c.id = ?`, [consultationId]
      );
      summary = await summarizeConsultation(
        merged,
        c?.topic || null,
        c?.advisor_name || null,
        c?.student_name || null
      );
      if (summary && typeof summary === 'string') {
        try {
          await ensureConsultationTranscriptColumns(pool);
          await pool.query('UPDATE consultations SET ai_summary = ? WHERE id = ?', [summary, consultationId]);
        } catch (dbErr) {
          // If ai_summary column doesn't exist (migration not applied), ignore gracefully
          if (String(dbErr?.code) !== 'ER_BAD_FIELD_ERROR') {
            console.warn('Failed to store AI summary:', dbErr);
          }
        }
      }
    } catch (summErr) {
      console.warn('Summarization flow error:', summErr);
    }

    return res.json({ success: true, mergedLength: merged.length, summarized: Boolean(summary) });
  } catch (err) {
    console.error('Transcriptions finalize error:', err);
    return res.status(500).json({ error: 'Failed to finalize transcript' });
  }
});

module.exports = router;
