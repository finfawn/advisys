const express = require('express');
const multer = require('multer');
const { getPool } = require('../db/pool');
const { summarizeConsultation } = require('../services/ai');

// Google Cloud Speech-to-Text v1 client
let SpeechClient;
try {
  SpeechClient = require('@google-cloud/speech').SpeechClient;
} catch (_) {
  SpeechClient = null;
}

// Google Cloud Storage client (optional, for gs:// URIs)
let Storage;
try {
  Storage = require('@google-cloud/storage').Storage;
} catch (_) {
  Storage = null;
}

const router = express.Router();
// Speech and Storage config from environment
const {
  SPEECH_LANGUAGE_CODE,
  SPEECH_ALTERNATIVE_LANGUAGE_CODES,
  SPEECH_MODEL,
  GCP_STT_KEY_PATH,
  GCP_STORAGE_KEY_PATH,
  GCS_BUCKET_NAME,
} = process.env;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB cap

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
// Accepts an audio file blob, runs Google STT, stores final transcript and AI summary
router.post('/transcriptions/upload', upload.single('file'), async (req, res) => {
  const pool = getPool();
  try {
    const file = req.file;
    const consultationIdRaw = req.body?.consultationId;
    const languageCode = req.body?.languageCode || SPEECH_LANGUAGE_CODE || 'en-US';
    if (!file) return res.status(400).json({ error: 'Missing audio file' });
    const consultationId = Number(consultationIdRaw);
    if (!consultationId) return res.status(400).json({ error: 'Missing or invalid consultationId' });

    // Guard: ensure Google client is available
    if (!SpeechClient) {
      return res.status(500).json({ error: 'Speech-to-Text client not available on server' });
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

    const client = GCP_STT_KEY_PATH && SpeechClient
      ? new SpeechClient({ keyFilename: GCP_STT_KEY_PATH })
      : new SpeechClient();
    // Try to infer encoding based on filename/mimetype; default to WEBM_OPUS since MediaRecorder commonly produces it
    const filename = req.file?.originalname || '';
    const lower = filename.toLowerCase();
    const mime = req.file?.mimetype || '';
    let encoding = 'WEBM_OPUS';
    if (lower.endsWith('.ogg') || mime.includes('ogg')) encoding = 'OGG_OPUS';
    if (lower.endsWith('.mp3') || mime.includes('mp3')) encoding = 'MP3';

    let audio = { content: file.buffer.toString('base64') };
    let uploadedGsUri = null;

    // If a bucket is configured and Storage client is available, upload to GCS and use gs:// URI
    if (Storage && GCS_BUCKET_NAME) {
      try {
        const storage = GCP_STORAGE_KEY_PATH ? new Storage({ keyFilename: GCP_STORAGE_KEY_PATH }) : new Storage();
        const bucket = storage.bucket(GCS_BUCKET_NAME);
        const ext = (lower.endsWith('.ogg') ? 'ogg' : lower.endsWith('.mp3') ? 'mp3' : 'webm');
        const objectName = `consultations/${consultationId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const fileRef = bucket.file(objectName);
        await fileRef.save(file.buffer, { contentType: mime || 'audio/webm', resumable: false, validation: false });
        uploadedGsUri = `gs://${GCS_BUCKET_NAME}/${objectName}`;
        audio = { uri: uploadedGsUri };
      } catch (gcsErr) {
        console.warn('GCS upload failed; falling back to inline content:', gcsErr);
      }
    }
    // Parse alternative languages from env if provided (comma-separated)
    const altRaw = SPEECH_ALTERNATIVE_LANGUAGE_CODES || '';
    const alternativeLanguageCodes = altRaw
      ? altRaw.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const config = {
      encoding,
      languageCode,
      enableAutomaticPunctuation: true,
      model: SPEECH_MODEL || 'default',
      audioChannelCount: undefined,
      alternativeLanguageCodes,
    };

    // Use longrunningRecognize to handle longer audio clips reliably
    const [operation] = await client.longrunningRecognize({ config, audio });
    const [response] = await operation.promise();
    const parts = [];
    for (const result of response.results || []) {
      const alt = result.alternatives && result.alternatives[0];
      if (alt && alt.transcript) parts.push(alt.transcript.trim());
    }
    const merged = parts.join('\n');

    // Persist transcript (no audio retained at rest)
    await pool.query('UPDATE consultations SET final_transcript = ? WHERE id = ?', [merged || null, consultationId]);

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

    // If we uploaded to GCS, delete the object to avoid retention
    if (uploadedGsUri) {
      try {
        const storage = GCP_STORAGE_KEY_PATH ? new Storage({ keyFilename: GCP_STORAGE_KEY_PATH }) : new Storage();
        const bucket = storage.bucket(GCS_BUCKET_NAME);
        const path = uploadedGsUri.replace(`gs://${GCS_BUCKET_NAME}/`, '');
        await bucket.file(path).delete({ ignoreNotFound: true });
      } catch (delErr) {
        console.warn('Failed to delete GCS object after STT:', delErr);
      }
    }

    // Return status.
    return res.json({ success: true, transcriptLength: merged.length || 0, summarized: Boolean(summary), usedGCS: Boolean(uploadedGsUri) });
  } catch (err) {
    console.error('Transcriptions upload error:', err);
    return res.status(500).json({ error: 'Failed to process uploaded audio' });
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

    // If there are no transcript entries, attempt a fallback summary using existing notes
    if (!entries || entries.length === 0) {
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

    await pool.query(
      'UPDATE consultations SET final_transcript = ? WHERE id = ?',
      [merged, consultationId]
    );

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