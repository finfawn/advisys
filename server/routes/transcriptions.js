const express = require('express');
const multer = require('multer');
const { getPool } = require('../db/pool');
const { summarizeConsultation } = require('../services/ai');

let S3Client, PutObjectCommand, DeleteObjectCommand;
let TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand;
try { ({ S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')); } catch (_) {}
try { ({ TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } = require('@aws-sdk/client-transcribe')); } catch (_) {}

const router = express.Router();
// Speech and Storage config from environment
const {
  SPEECH_LANGUAGE_CODE,
  SPEECH_ALTERNATIVE_LANGUAGE_CODES,
  SPEECH_MODEL,
  S3_UPLOADS_BUCKET,
  AWS_REGION,
} = process.env;
// Allow disabling STT upload for local/dev environments
const DISABLE_STT_UPLOAD = String(process.env.DISABLE_STT_UPLOAD || '').toLowerCase() === 'true';
// Optional: retain uploaded audio in cloud storage (default: delete after STT completes)
const KEEP_RECORDINGS_AT_REST = String(process.env.KEEP_RECORDINGS_AT_REST || '').toLowerCase() === 'true';
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
router.post('/transcriptions/upload', upload.single('file'), async (req, res) => {
  const pool = getPool();
  try {
    const file = req.file;
    const consultationIdRaw = req.body?.consultationId;
    const languageCode = req.body?.languageCode || SPEECH_LANGUAGE_CODE || 'en-US';
    if (!file) return res.status(400).json({ error: 'Missing audio file' });
    const consultationId = Number(consultationIdRaw);
    if (!consultationId) return res.status(400).json({ error: 'Missing or invalid consultationId' });

    if (DISABLE_STT_UPLOAD) {
      try {
        await pool.query('UPDATE consultations SET final_transcript = ? WHERE id = ?', [null, consultationId]);
      } catch (_) {}
      return res.json({ success: true, transcriptLength: 0, summarized: false, bypassed: true });
    }

    if (!S3Client || !TranscribeClient || !S3_UPLOADS_BUCKET) {
      return res.status(500).json({ error: 'Transcribe not available on server' });
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
    const mediaFormat = ext.replace('.', '');
    const region = AWS_REGION || 'us-east-1';
    const s3 = new S3Client({ region });
    const transcribe = new TranscribeClient({ region });
    const key = `consultations/${consultationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await s3.send(new PutObjectCommand({ Bucket: S3_UPLOADS_BUCKET, Key: key, Body: file.buffer, ContentType: mime || 'audio/webm' }));
    const jobName = `advisys-${consultationId}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 200);
    await transcribe.send(new StartTranscriptionJobCommand({ TranscriptionJobName: jobName, LanguageCode: languageCode, Media: { MediaFileUri: `s3://${S3_UPLOADS_BUCKET}/${key}` }, MediaFormat: mediaFormat }));
    let status = 'IN_PROGRESS';
    let transcriptUri = null;
    const start = Date.now();
    while (status === 'IN_PROGRESS' || status === 'QUEUED') {
      const out = await transcribe.send(new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }));
      status = out?.TranscriptionJob?.TranscriptionJobStatus || 'FAILED';
      if (status === 'COMPLETED') {
        transcriptUri = out.TranscriptionJob.Transcript?.TranscriptFileUri || null;
        break;
      }
      if (status === 'FAILED') break;
      if (Date.now() - start > 5 * 60 * 1000) break;
      await new Promise(r => setTimeout(r, 5000));
    }
    if (status !== 'COMPLETED' || !transcriptUri) {
      try { await pool.query('UPDATE consultations SET final_transcript = ? WHERE id = ?', [null, consultationId]); } catch (_) {}
      try { if (!KEEP_RECORDINGS_AT_REST) await s3.send(new DeleteObjectCommand({ Bucket: S3_UPLOADS_BUCKET, Key: key })); } catch (_) {}
      return res.json({ success: true, transcriptLength: 0, summarized: false, sttError: 'Transcribe failed' });
    }
    const resp = await fetch(transcriptUri);
    const j = await resp.json();
    const merged = Array.isArray(j?.results?.transcripts) && j.results.transcripts[0]?.transcript ? j.results.transcripts.map(t => t.transcript).join('\n') : (j?.results?.transcripts?.[0]?.transcript || j?.results?.items?.map(i => i.alternatives?.[0]?.content || '').join('') || '');

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

    if (S3Client && S3_UPLOADS_BUCKET) {
      if (KEEP_RECORDINGS_AT_REST) {
        try { await pool.query('UPDATE consultations SET recording_uri = ? WHERE id = ?', [`s3://${S3_UPLOADS_BUCKET}/${key}`, consultationId]); } catch (_) {}
      } else {
        try { await s3.send(new DeleteObjectCommand({ Bucket: S3_UPLOADS_BUCKET, Key: key })); } catch (_) {}
      }
    }

    // Return status.
    return res.json({ success: true, transcriptLength: merged.length || 0, summarized: Boolean(summary), usedS3: true, recordingUri: KEEP_RECORDINGS_AT_REST ? `s3://${S3_UPLOADS_BUCKET}/${key}` : null });
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