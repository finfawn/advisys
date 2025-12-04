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
    const file = req.file;
    const consultationIdRaw = req.body?.consultationId;
    let languageCode = normalizeLang(req.body?.languageCode || SPEECH_LANGUAGE_CODE || 'en-US');
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
    let gcsUri = null;
    let bytes = null;

    const client = GCP_STORAGE_KEY_PATH ? new SpeechClient({ keyFilename: GCP_STORAGE_KEY_PATH }) : new SpeechClient();
    const altRaw = String(SPEECH_ALTERNATIVE_LANGUAGE_CODES || '').trim();
    const alternativeLanguageCodes = altRaw ? altRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    function encodingForExt(e) {
      const m = String(e || '').toLowerCase();
      if (m === 'webm') return 'WEBM_OPUS';
      if (m === 'ogg') return 'OGG_OPUS';
      if (m === 'mp3') return 'MP3';
      if (m === 'wav') return 'LINEAR16';
      return undefined;
    }
    const cfgBase = {
      languageCode,
      enableAutomaticPunctuation: true,
    };
    const diarize = String(SPEECH_ENABLE_DIARIZATION || '').toLowerCase() === 'true';
    const minSpk = Number(SPEECH_MIN_SPEAKERS || 2) || 2;
    const maxSpk = Number(SPEECH_MAX_SPEAKERS || 2) || 2;
    if (diarize) {
      cfgBase.enableSpeakerDiarization = true;
      cfgBase.diarizationConfig = { enableSpeakerDiarization: true, minSpeakerCount: minSpk, maxSpeakerCount: maxSpk };
    }
    const enc = encodingForExt(ext);
    if (enc) cfgBase.encoding = enc;
    if (SPEECH_MODEL) cfgBase.model = SPEECH_MODEL;
    const alts = alternativeLanguageCodes.filter(x => x && x !== languageCode);
    // Upload to GCS first (preferred pipeline: bucket -> STT)
    if (Storage && GCS_BUCKET_NAME) {
      try {
        const storage = GCP_STORAGE_KEY_PATH ? new Storage({ keyFilename: GCP_STORAGE_KEY_PATH }) : new Storage();
        const bucket = storage.bucket(GCS_BUCKET_NAME);
        const prefix = (GCS_TRANSCRIPTIONS_PREFIX || 'consultations').replace(/\/$/, '');
        const key = `${prefix}/${consultationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        await bucket.file(key).save(file.buffer, { contentType: mime || 'audio/webm', resumable: false, public: false });
        gcsUri = `gs://${GCS_BUCKET_NAME}/${key}`;
        try {
          await bucket.file(key).makePublic();
          recordingUri = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${key}`;
        } catch (_) {
          try {
            const [signed] = await bucket.file(key).getSignedUrl({ action: 'read', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
            recordingUri = signed;
          } catch (_) {
            recordingUri = gcsUri;
          }
        }
        try { await pool.query('UPDATE consultations SET recording_uri = ? WHERE id = ?', [recordingUri, consultationId]); } catch (_) {}
      } catch (_) {
        gcsUri = null;
      }
    }

    let response;
    try {
      const cfg1 = { ...cfgBase };
      if (alts.length) cfg1.alternativeLanguageCodes = alts;
      if (!gcsUri) bytes = file.buffer.toString('base64');
      const audio1 = gcsUri ? { uri: gcsUri } : { content: bytes };
      const [operation] = await client.longRunningRecognize({ audio: audio1, config: cfg1 });
      const [resp] = await operation.promise();
      response = resp;
    } catch (err) {
      const msg = String(err?.message || err);
      const details = String(err?.details || '');
      const codeVal = Number(err?.code || NaN);
      const notSupported = /alternative_language_codes/i.test(msg) && /not supported/i.test(msg);
      const invalidArg = details.includes('INVALID_ARGUMENT') || codeVal === 3;
      if (alts.length && (notSupported || invalidArg)) {
        const cfg2 = { ...cfgBase };
        delete cfg2.alternativeLanguageCodes;
        delete cfg2.model;
        if (!gcsUri && !bytes) bytes = file.buffer.toString('base64');
        const audio2 = gcsUri ? { uri: gcsUri } : { content: bytes };
        const [operation2] = await client.longRunningRecognize({ audio: audio2, config: cfg2 });
        const [resp2] = await operation2.promise();
        response = resp2;
      } else if (invalidArg) {
        const cfg3 = { languageCode: 'en-US', enableAutomaticPunctuation: true };
        if (diarize) { cfg3.enableSpeakerDiarization = true; cfg3.diarizationConfig = { enableSpeakerDiarization: true, minSpeakerCount: minSpk, maxSpeakerCount: maxSpk }; }
        if (enc) cfg3.encoding = enc;
        if (!gcsUri && !bytes) bytes = file.buffer.toString('base64');
        const audio3 = gcsUri ? { uri: gcsUri } : { content: bytes };
        const [operation3] = await client.longRunningRecognize({ audio: audio3, config: cfg3 });
        const [resp3] = await operation3.promise();
        response = resp3;
      } else {
        throw err;
      }
    }
    merged = Array.isArray(response?.results) ? response.results.map(r => r.alternatives?.[0]?.transcript || '').filter(Boolean).join('\n') : '';

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
    console.error('Transcriptions upload error:', { message: err?.message || String(err), code: err?.code, details: err?.details });
    const codeVal = Number(err?.code || NaN);
    const detailsStr = String(err?.details || '');
    if (detailsStr.includes('INVALID_ARGUMENT') || codeVal === 3) {
      return res.status(400).json({ error: 'Invalid STT configuration', details: err?.message || detailsStr });
    }
    return res.status(500).json({ error: 'Failed to process uploaded audio', details: err?.message || String(err) });
  }
});

router.post('/transcriptions/reprocess/:id', async (req, res) => {
  const pool = getPool();
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const [[cRow]] = await pool.query(
      `SELECT c.*, s.full_name AS student_name, a.full_name AS advisor_name
       FROM consultations c
       JOIN users s ON s.id = c.student_user_id
       JOIN users a ON a.id = c.advisor_user_id
       WHERE c.id = ?`, [id]
    );
    if (!cRow) return res.status(404).json({ error: 'Consultation not found' });

    let transcript = String(cRow.final_transcript || '').trim();
    let summary = String(cRow.ai_summary || '').trim();
    const recordingUri = cRow.recording_uri || null;

    if (!summary && transcript) {
      const s = await summarizeConsultation(transcript, cRow.topic || null, cRow.advisor_name || null, cRow.student_name || null);
      if (s) {
        try { await pool.query('UPDATE consultations SET ai_summary = ? WHERE id = ?', [s, id]); } catch (_) {}
        summary = s;
      }
    }

  if (!summary && !transcript && recordingUri) {
      const languageCode = normalizeLang(SPEECH_LANGUAGE_CODE || 'en-US');
      const altRaw = String(SPEECH_ALTERNATIVE_LANGUAGE_CODES || '').trim();
      const alternativeLanguageCodes = altRaw ? altRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
      const gcsUri = deriveGcsUri(recordingUri);
      if (!SpeechClient || !gcsUri) return res.status(400).json({ error: 'Cannot reprocess: STT unavailable or recording not on GCS' });
      const client = GCP_STORAGE_KEY_PATH ? new SpeechClient({ keyFilename: GCP_STORAGE_KEY_PATH }) : new SpeechClient();
      const cfgBase = { languageCode, enableAutomaticPunctuation: true };
      if (String(SPEECH_ENABLE_DIARIZATION || '').toLowerCase() === 'true') {
        const minSpk = Number(SPEECH_MIN_SPEAKERS || 2) || 2;
        const maxSpk = Number(SPEECH_MAX_SPEAKERS || 2) || 2;
        cfgBase.enableSpeakerDiarization = true;
        cfgBase.diarizationConfig = { enableSpeakerDiarization: true, minSpeakerCount: minSpk, maxSpeakerCount: maxSpk };
      }
      if (SPEECH_MODEL) cfgBase.model = SPEECH_MODEL;
      const alts = alternativeLanguageCodes.filter(x => x && x !== languageCode);
      let response;
      try {
        const cfg1 = { ...cfgBase };
        if (alts.length) cfg1.alternativeLanguageCodes = alts;
        const [op] = await client.longRunningRecognize({ audio: { uri: gcsUri }, config: cfg1 });
        const [resp] = await op.promise();
        response = resp;
      } catch (err) {
        const msg = String(err?.message || err);
        const details = String(err?.details || '');
        const codeVal = Number(err?.code || NaN);
        const notSupported = /alternative_language_codes/i.test(msg) && /not supported/i.test(msg);
        const invalidArg = details.includes('INVALID_ARGUMENT') || codeVal === 3;
        if (alts.length && (notSupported || invalidArg)) {
          const cfg2 = { ...cfgBase };
          const [op2] = await client.longRunningRecognize({ audio: { uri: gcsUri }, config: cfg2 });
          const [resp2] = await op2.promise();
          response = resp2;
        } else if (invalidArg) {
          const cfg3 = { languageCode: 'en-US', enableAutomaticPunctuation: true };
          if (String(SPEECH_ENABLE_DIARIZATION || '').toLowerCase() === 'true') {
            const minSpk = Number(SPEECH_MIN_SPEAKERS || 2) || 2;
            const maxSpk = Number(SPEECH_MAX_SPEAKERS || 2) || 2;
            cfg3.enableSpeakerDiarization = true;
            cfg3.diarizationConfig = { enableSpeakerDiarization: true, minSpeakerCount: minSpk, maxSpeakerCount: maxSpk };
          }
          const [op3] = await client.longRunningRecognize({ audio: { uri: gcsUri }, config: cfg3 });
          const [resp3] = await op3.promise();
          response = resp3;
        } else {
          throw err;
        }
      }
      transcript = Array.isArray(response?.results) ? response.results.map(r => r.alternatives?.[0]?.transcript || '').filter(Boolean).join('\n') : '';
      try { await ensureConsultationTranscriptColumns(pool); await pool.query('UPDATE consultations SET final_transcript = ? WHERE id = ?', [transcript || null, id]); } catch (_) {}
      if (transcript) {
        const s2 = await summarizeConsultation(transcript, cRow.topic || null, cRow.advisor_name || null, cRow.student_name || null);
        if (s2) {
          try { await ensureConsultationTranscriptColumns(pool); await pool.query('UPDATE consultations SET ai_summary = ? WHERE id = ?', [s2, id]); } catch (_) {}
          summary = s2;
        }
      }
    }

    return res.json({ success: true, transcriptLength: (transcript || '').length, summarized: Boolean(summary) });
  } catch (err) {
    console.error('Transcriptions reprocess error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to reprocess consultation' });
  }
});

router.post('/transcriptions/reprocess-missing', async (req, res) => {
  const pool = getPool();
  try {
    const limit = Number(req.body?.limit || 10);
    const [rows] = await pool.query(
      `SELECT c.id
       FROM consultations c
       WHERE c.ai_summary IS NULL AND (c.final_transcript IS NOT NULL OR c.recording_uri IS NOT NULL)
       ORDER BY c.id ASC
       LIMIT ?`, [limit]
    );
    let processed = 0, summarized = 0;
    for (const r of rows) {
      try {
        const reqId = r.id;
        const [[c]] = await pool.query('SELECT final_transcript, ai_summary, recording_uri, topic, advisor_user_id, student_user_id FROM consultations WHERE id = ?', [reqId]);
        let transcript = String(c?.final_transcript || '').trim();
        let summary = String(c?.ai_summary || '').trim();
        if (!summary && transcript) {
          const [[names]] = await pool.query('SELECT s.full_name AS student_name, a.full_name AS advisor_name FROM users s, users a WHERE s.id = ? AND a.id = ?', [c.student_user_id, c.advisor_user_id]);
          const s1 = await summarizeConsultation(transcript, c?.topic || null, names?.advisor_name || null, names?.student_name || null);
          if (s1) { await pool.query('UPDATE consultations SET ai_summary = ? WHERE id = ?', [s1, reqId]); summary = s1; }
        } else if (!summary && !transcript && c?.recording_uri) {
          const gcsUri = deriveGcsUri(c.recording_uri);
          if (SpeechClient && gcsUri) {
            const client = GCP_STORAGE_KEY_PATH ? new SpeechClient({ keyFilename: GCP_STORAGE_KEY_PATH }) : new SpeechClient();
            const languageCode = normalizeLang(SPEECH_LANGUAGE_CODE || 'en-US');
            const cfg = { languageCode, enableAutomaticPunctuation: true };
            if (String(SPEECH_ENABLE_DIARIZATION || '').toLowerCase() === 'true') {
              const minSpk = Number(SPEECH_MIN_SPEAKERS || 2) || 2;
              const maxSpk = Number(SPEECH_MAX_SPEAKERS || 2) || 2;
              cfg.enableSpeakerDiarization = true;
              cfg.diarizationConfig = { enableSpeakerDiarization: true, minSpeakerCount: minSpk, maxSpeakerCount: maxSpk };
            }
            if (SPEECH_MODEL) cfg.model = SPEECH_MODEL;
            const [op] = await client.longRunningRecognize({ audio: { uri: gcsUri }, config: cfg });
            const [resp] = await op.promise();
            transcript = Array.isArray(resp?.results) ? resp.results.map(x => x.alternatives?.[0]?.transcript || '').filter(Boolean).join('\n') : '';
            if (transcript) { await ensureConsultationTranscriptColumns(pool); await pool.query('UPDATE consultations SET final_transcript = ? WHERE id = ?', [transcript, reqId]); }
            const [[names]] = await pool.query('SELECT s.full_name AS student_name, a.full_name AS advisor_name FROM users s, users a WHERE s.id = ? AND a.id = ?', [c.student_user_id, c.advisor_user_id]);
            const s2 = await summarizeConsultation(transcript, c?.topic || null, names?.advisor_name || null, names?.student_name || null);
            if (s2) { await ensureConsultationTranscriptColumns(pool); await pool.query('UPDATE consultations SET ai_summary = ? WHERE id = ?', [s2, reqId]); summary = s2; }
          }
        }
        processed++;
        if (summary) summarized++;
      } catch (_) {}
    }
    return res.json({ success: true, processed, summarized, remaining: Math.max(0, (rows?.length || 0) - summarized) });
  } catch (err) {
    console.error('Transcriptions batch reprocess error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to batch reprocess' });
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
