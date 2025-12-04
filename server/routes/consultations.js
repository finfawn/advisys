const express = require('express');
const { getPool } = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const { notify } = require('../services/notifications');
const { optimizeBookingText } = require('../services/ai');

function formatDate(d) {
  // Always format date in Asia/Manila to avoid server-local timezone drift
  const parts = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value || String(d.getFullYear());
  const m = parts.find((p) => p.type === 'month')?.value || String(d.getMonth() + 1).padStart(2, '0');
  const day = parts.find((p) => p.type === 'day')?.value || String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTimeRange(start, end) {
  // Format time using Asia/Manila timezone and 12-hour style
  const fmt = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

// Load notification settings for a user, with safe defaults
// getNotificationSettings imported from service

// Create a new consultation (student books a slot)
// POST /api/consultations
// Body: {
//   student_user_id,
//   advisor_user_id,
//   topic,            // what the student selected (usually a category/topic)
//   category,         // optional; falls back to topic
//   mode,             // 'online' | 'in-person'
//   location,         // optional (for in-person)
//   student_notes,    // optional description
//   start_datetime,
//   end_datetime,
//   slot_id           // optional; if provided, will be marked booked
// }
router.post('/consultations', async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    const body = req.body || {};
    const studentId = body.student_user_id;
    const advisorId = body.advisor_user_id;
    const topic = body.topic;
    const category = body.category || topic || null;
    const mode = body.mode; // expect 'online' | 'in-person'
    const location = body.location || null;
    const notes = body.student_notes || body.description || null;
    const startIso = body.start_datetime;
    const endIso = body.end_datetime;
    const slotId = body.slot_id || null;

    if (!studentId || !advisorId || !topic || !mode || !startIso || !endIso) {
      return res.status(400).json({ error: 'Missing required fields: student_user_id, advisor_user_id, topic, mode, start_datetime, end_datetime' });
    }

    // Normalize mode to match consultations schema
    const modeNorm = String(mode).toLowerCase() === 'in-person' ? 'in-person' : 'online';

    // Resolve current academic term (defensive if table missing)
    let currentTermId = null;
    try {
      const [[currTerm]] = await pool.query('SELECT id FROM academic_terms WHERE is_current = 1 LIMIT 1');
      currentTermId = currTerm?.id || null;
    } catch (e) {
      currentTermId = null;
    }

    // If a current term exists, ensure membership exists; block only if explicitly non-eligible
    if (currentTermId) {
      try {
        const [[m]] = await pool.query(
          `SELECT status_in_term FROM academic_term_memberships WHERE term_id = ? AND user_id = ? AND role = 'student'`,
          [currentTermId, studentId]
        );
        if (!m) {
          let prog = null, yr = null;
          try {
            const [[sp]] = await pool.query('SELECT program, year_level FROM student_profiles WHERE user_id = ? LIMIT 1', [studentId]);
            prog = sp?.program || null;
            yr = sp?.year_level != null ? String(sp.year_level) : null;
          } catch (_) {}
          await pool.query(
            `INSERT IGNORE INTO academic_term_memberships (term_id,user_id,role,status_in_term,program_snapshot,year_level_snapshot)
             VALUES (?,?,?,?,?,?)`,
            [currentTermId, studentId, 'student', 'enrolled', prog, yr]
          );
        } else if (String(m.status_in_term) !== 'enrolled') {
          return res.status(400).json({ error: 'Student is not eligible to book in the current academic term' });
        }
      } catch (_) {
        // If term membership tables are missing, proceed without blocking
      }
    }

    await conn.beginTransaction();

    // If a slot_id is provided, ensure it is available and then mark booked
    if (slotId) {
      const [sRows] = await conn.query('SELECT status FROM advisor_slots WHERE id = ? FOR UPDATE', [slotId]);
      if (!sRows.length) {
        await conn.rollback();
        return res.status(404).json({ error: 'Advisor slot not found' });
      }
      const s = sRows[0];
      const currStatus = String(s.status || '').toLowerCase();
      if (currStatus !== 'available') {
        await conn.rollback();
        return res.status(409).json({ error: 'Slot is no longer available' });
      }
      await conn.query('UPDATE advisor_slots SET status = ? WHERE id = ?', ['booked', slotId]);
    }

    // Removed undefined reschedule cleanup block

    // Robustly parse incoming datetimes (slots are stored as UTC MySQL strings)
    const parseUtcMySQL = (val) => {
      if (!val) return null;
      if (val instanceof Date) return val;
      const s = String(val).trim();
      if (!s) return null;
      if (/([zZ]|[+\-]\d{2}:?\d{2})$/.test(s)) {
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
      }
      const cleaned = s.replace(' ', 'T');
      const d = new Date(`${cleaned}Z`);
      return isNaN(d.getTime()) ? null : d;
    };

    const start = parseUtcMySQL(startIso);
    const end = parseUtcMySQL(endIso);
    if (!start || !end) {
      return res.status(400).json({ error: 'Invalid start_datetime or end_datetime' });
    }

    // Compute duration in minutes
    const durationMin = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

    // Insert consultation
    let hasTermCol = false;
    try {
      const [cols] = await pool.query('SHOW COLUMNS FROM consultations LIKE "academic_term_id"');
      hasTermCol = !!(cols && cols.length);
    } catch (_) {
      hasTermCol = false;
    }
    let insertSql;
    let insertParams;
    if (hasTermCol) {
      insertSql = `INSERT INTO consultations
        (student_user_id, advisor_user_id, topic, category, mode, location, student_notes, start_datetime, end_datetime, duration_minutes, status, academic_term_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`;
      insertParams = [
        studentId,
        advisorId,
        topic,
        category,
        modeNorm,
        location,
        notes,
        start,
        end,
        durationMin || null,
        'pending',
        currentTermId
      ];
    } else {
      insertSql = `INSERT INTO consultations
        (student_user_id, advisor_user_id, topic, category, mode, location, student_notes, start_datetime, end_datetime, duration_minutes, status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
      insertParams = [
        studentId,
        advisorId,
        topic,
        category,
        modeNorm,
        location,
        notes,
        start,
        end,
        durationMin || null,
        'pending'
      ];
    }
    const [insertRes] = await conn.query(insertSql, insertParams);

    const newId = insertRes.insertId;

    // Snapshot advisor's current consultation guidelines into this consultation
    try {
      const [glRows] = await conn.query(
        'SELECT guideline_text FROM advisor_guidelines WHERE advisor_user_id = ?',
        [advisorId]
      );
      for (const g of glRows) {
        const txt = String(g.guideline_text || '').trim();
        if (txt) {
          await conn.query(
            'INSERT INTO consultation_guidelines (consultation_id, guideline_text) VALUES (?, ?)',
            [newId, txt]
          );
        }
      }
    } catch (e) {
      // Non-fatal: if guidelines copy fails, proceed with booking
      console.warn('Failed to snapshot advisor guidelines for consultation', e);
    }

    await conn.commit();

    // Return the newly created consultation in the same shape as GET endpoints
    let r;
    try {
      const [rows] = await pool.query(
        `SELECT c.*, u.full_name AS advisor_name, ap.title AS advisor_title, ap.avatar_url AS advisor_avatar_url
         FROM consultations c
         JOIN users u ON u.id = c.advisor_user_id
         LEFT JOIN advisor_profiles ap ON ap.user_id = u.id
         WHERE c.id = ?`, [newId]
      );
      if (!rows.length) {
        return res.status(500).json({ error: 'Failed to load created consultation' });
      }
      r = rows[0];
    } catch (e) {
      const [rows] = await pool.query(
        `SELECT c.*, u.full_name AS advisor_name
         FROM consultations c
         JOIN users u ON u.id = c.advisor_user_id
         WHERE c.id = ?`, [newId]
      );
      if (!rows.length) {
        return res.status(500).json({ error: 'Failed to load created consultation' });
      }
      r = rows[0];
      r.advisor_title = null;
      r.advisor_avatar_url = null;
    }
    const startDt = new Date(r.start_datetime);
    const endDt = new Date(r.end_datetime);
    const date = formatDate(startDt);
    const time = formatTimeRange(startDt, endDt);

    // Create notification for advisor: new consultation request
    try {
      const [[stu]] = await pool.query('SELECT full_name FROM users WHERE id = ?', [studentId]);
      const studentName = stu?.full_name || 'Student';
      const title = `New consultation request from ${studentName}`;
      const message = `${studentName} requested a consultation for '${topic}' on ${date} at ${time}.`;
      await notify(pool, advisorId, 'consultation_request', title, message, {
        consultation_id: newId,
        date,
        time,
        topic,
        mode: modeNorm,
      });
    } catch (err) {
      console.error('Advisor request notification error', err);
    }

    // Create notification for student: request submitted and awaiting approval
    try {
      const titleStu = `Consultation request submitted`;
      const guidance = modeNorm === 'online'
        ? `Await advisor approval. A meeting link will be provided once approved.`
        : `Await advisor approval. Location details will be confirmed upon approval.`;
      const messageStu = `Your request for '${topic}' on ${date} at ${time} has been submitted. ${guidance}`;
      await notify(pool, studentId, 'consultation_request_submitted', titleStu, messageStu, {
        consultation_id: newId,
        date,
        time,
        topic,
        mode: modeNorm,
      });
    } catch (err) {
      console.error('Student request notification error', err);
    }
    // Load any copied guidelines to include in the response shape
    const [cgRows] = await pool.query(
      'SELECT guideline_text FROM consultation_guidelines WHERE consultation_id = ?',
      [r.id]
    );

    return res.status(201).json({
      id: r.id,
      date,
      time,
      topic: r.topic,
      faculty: {
        name: r.advisor_name,
        title: r.advisor_title,
        avatar_url: r.advisor_avatar_url || null,
      },
      mode: r.mode,
      status: r.status,
      meetingLink: r.meeting_link || undefined,
      location: r.location || undefined,
      duration: r.duration_minutes || 30,
      bookingDate: r.booking_date,
      guidelines: cgRows.map(g => g.guideline_text),
    });
  } catch (err) {
    console.error('Create consultation error', err);
    try { await conn.rollback(); } catch (_) {}
    res.status(500).json({ error: 'Failed to create consultation' });
  } finally {
    conn.release();
  }
});

router.post('/ai/optimize-consultation-input', authMiddleware, async (req, res) => {
  try {
    const { description, title } = req.body || {};
    const desc = String(description || '').trim();
    const t = String(title || '').trim();
    if (!desc) return res.status(400).json({ error: 'Description is required' });
    const result = await optimizeBookingText(desc, t);
    if (!result) return res.status(503).json({ error: 'AI not available' });
    const out = {
      title: String(result.title || t).slice(0, 64),
      description: String(result.description || desc).slice(0, 300)
    };
    return res.json(out);
  } catch (e) {
    return res.status(500).json({ error: 'Optimize failed' });
  }
});

// Get consultations for a specific student
// GET /api/consultations/students/:studentId/consultations
// Note: consultations router is mounted at '/api', so include '/consultations' in path
router.get('/consultations/students/:studentId/consultations', authMiddleware, async (req, res) => {
  const pool = getPool();
  const studentId = req.params.studentId;
  const { termId, term } = req.query || {};

  try {
    let where = 'WHERE c.student_user_id = ?';
    const params = [studentId];
    if (String(term).toLowerCase() !== 'all') {
      let termToUse = Number(termId) || null;
      if (!termToUse) {
        const [[curr]] = await pool.query('SELECT id FROM academic_terms WHERE is_current = 1 LIMIT 1');
        termToUse = curr?.id || null;
      }
      if (termToUse) { where += ' AND c.academic_term_id = ?'; params.push(termToUse); }
    }
    const [rows] = await pool.query(
      `SELECT c.*, u.full_name AS advisor_name, ap.title AS advisor_title, ap.avatar_url AS advisor_avatar_url
       FROM consultations c
       JOIN users u ON u.id = c.advisor_user_id
       JOIN advisor_profiles ap ON ap.user_id = u.id
       ${where}
       ORDER BY c.start_datetime DESC`,
      params
    );

  const consultations = rows.map(r => {
      const startDt = new Date(r.start_datetime);
      const endDt = new Date(r.end_datetime);
      const date = formatDate(startDt);
      const time = formatTimeRange(startDt, endDt);

      // Prefer actual duration if advisor marked start/end; otherwise use scheduled or stored duration_minutes
      const actualStart = r.actual_start_datetime ? new Date(r.actual_start_datetime) : null;
      const actualEnd = r.actual_end_datetime ? new Date(r.actual_end_datetime) : null;
      const computedDuration = (actualStart && actualEnd)
        ? Math.max(0, Math.round((actualEnd.getTime() - actualStart.getTime()) / 60000))
        : (Number(r.duration_minutes || 0) || Math.max(0, Math.round((endDt.getTime() - startDt.getTime()) / 60000)));

      const requestStatus = (() => {
        const s = String(r.status || '').toLowerCase();
        const isOnline = String(r.mode || '').toLowerCase() === 'online';
        const value = s === 'approved' ? (isOnline ? (r.meeting_link || null) : (r.location || r.room_name || null)) : null;
        const reason = s === 'declined' ? (r.decline_reason || null)
          : s === 'cancelled' || s === 'canceled' ? (r.cancel_reason || null)
          : null;
        return { status: s, value, reason };
      })();

      return {
        id: r.id,
        date,
        time,
        // Expose raw datetimes for client-side history logic
        start_datetime: r.start_datetime,
        end_datetime: r.end_datetime,
        actual_start_datetime: r.actual_start_datetime || null,
        actual_end_datetime: r.actual_end_datetime || null,
        // Summary edit approval flag exposed for student UI gating
        summaryEditApprovedAt: r.summary_edit_approved_at || undefined,
        topic: r.topic,
        category: r.category,
        mode: r.mode,
        status: r.status,
        meetingLink: r.meeting_link || undefined,
        location: r.location || undefined,
        duration: computedDuration,
        bookingDate: r.booking_date,
        advisor: {
          id: r.advisor_user_id,
          name: r.advisor_name,
          title: r.advisor_title,
          avatar_url: r.advisor_avatar_url || null,
        },
        // Notes and summary
        studentNotes: r.student_notes || undefined,
        studentPrivateNotes: r.student_private_notes || undefined,
        // Do not expose advisor notes to students
        summaryNotes: r.summary_notes || undefined,
        finalTranscript: r.final_transcript || undefined,
        aiSummary: r.ai_summary || undefined,
        // Standardized reasons for student consumption
        decline_reason: r.decline_reason || null,
        cancel_reason: r.cancel_reason || null,
        cancellation_reason: r.cancel_reason || null,
        // Unified conditional field
        request_status: requestStatus,
      };
    });

    return res.status(200).json(consultations);
  } catch (err) {
    console.error('Failed to fetch student consultations:', err?.message || err);
    return res.status(500).json({ error: 'Failed to fetch student consultations' });
  }
});

// Helper to format year level like "1st Year", "2nd Year", etc.
function yearLabel(yrRaw) {
  const n = Number(yrRaw) || 1;
  const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
  return `${n}${suffix} Year`;
}

// GET /api/advisors/:advisorId/consultations
// Returns consultations for an advisor, including student display info
router.get('/consultations/advisors/:advisorId/consultations', async (req, res) => {
  const pool = getPool();
  try {
    const advisorId = req.params.advisorId;
    const { termId, term } = req.query || {};
    let where = 'WHERE c.advisor_user_id = ?';
    const params = [advisorId];
    if (String(term).toLowerCase() !== 'all') {
      let termToUse = Number(termId) || null;
      if (!termToUse) {
        const [[curr]] = await pool.query('SELECT id FROM academic_terms WHERE is_current = 1 LIMIT 1');
        termToUse = curr?.id || null;
      }
      if (termToUse) { where += ' AND c.academic_term_id = ?'; params.push(termToUse); }
    }
    const [rows] = await pool.query(
      `SELECT c.*, u.full_name AS student_name, sp.program AS student_program, sp.year_level AS student_year, sp.avatar_url AS student_avatar_url
       FROM consultations c
       JOIN users u ON u.id = c.student_user_id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       ${where}
       ORDER BY c.start_datetime ASC`, params
    );

  const result = [];
  for (const r of rows) {
    const start = new Date(r.start_datetime);
    const end = new Date(r.end_datetime);
    const date = formatDate(start);
    const time = formatTimeRange(start, end);
    const [guidelines] = await pool.query('SELECT guideline_text FROM consultation_guidelines WHERE consultation_id = ?', [r.id]);
    const course = r.student_program ? `${r.student_program} - ${yearLabel(r.student_year || 1)}` : yearLabel(r.student_year || 1);
    const actualStart = r.actual_start_datetime ? new Date(r.actual_start_datetime) : null;
    const actualEnd = r.actual_end_datetime ? new Date(r.actual_end_datetime) : null;
    const computedDuration = (actualStart && actualEnd)
      ? Math.max(0, Math.round((actualEnd.getTime() - actualStart.getTime()) / 60000))
      : (Number(r.duration_minutes || 0) || Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)));

    const requestStatus = (() => {
      const s = String(r.status || '').toLowerCase();
      const isOnline = String(r.mode || '').toLowerCase() === 'online';
      const value = s === 'approved' ? (isOnline ? (r.meeting_link || null) : (r.location || r.room_name || null)) : null;
      const reason = s === 'declined' ? (r.decline_reason || null)
        : s === 'cancelled' || s === 'canceled' ? (r.cancel_reason || null)
        : null;
      return { status: s, value, reason };
    })();

    result.push({
      id: r.id,
      date,
      time,
      // Expose raw datetimes for client-side logic (e.g., 15-min no-show)
      start_datetime: r.start_datetime,
      end_datetime: r.end_datetime,
      actual_start_datetime: r.actual_start_datetime || null,
      actual_end_datetime: r.actual_end_datetime || null,
      topic: r.topic,
      // Include student-selected category and notes to render accurate details
      category: r.category || undefined,
      // Do not expose student notes to advisors
      advisorPrivateNotes: (r.advisor_notes != null ? r.advisor_notes : r.advisor_private_notes) || undefined,
      summaryNotes: r.summary_notes || undefined,
      finalTranscript: r.final_transcript || undefined,
      aiSummary: r.ai_summary || undefined,
      summaryEditApprovedAt: r.summary_edit_approved_at || undefined,
      student: {
        name: r.student_name,
        course,
        avatar_url: r.student_avatar_url || null,
      },
      mode: r.mode,
      status: r.status,
        roomName: r.room_name || undefined,
        location: r.location || undefined,
        declineReason: r.decline_reason || undefined,
        cancelReason: r.cancel_reason || undefined,
        // Also expose standardized snake_case for clients expecting these names
        decline_reason: r.decline_reason || null,
        cancel_reason: r.cancel_reason || null,
      cancellation_reason: r.cancel_reason || null,
      request_status: requestStatus,
      duration: computedDuration,
      bookingDate: r.booking_date,
      guidelines: guidelines.map(g => g.guideline_text),
    });
  }
    res.json(result);
  } catch (err) {
    console.error('Advisor consultations error', err);
    res.status(500).json({ error: 'Failed to load consultations' });
  }
});

// Update consultation status and related fields
// PATCH /api/consultations/:id/status
router.patch('/consultations/:id/status', async (req, res) => {
  const pool = getPool();
  const id = req.params.id;
  const { status, declineReason, cancelReason, location, noShowParty, summaryNotes } = req.body || {};
  const allowed = new Set(['pending','approved','declined','completed','cancelled','missed']);
  if (!status || !allowed.has(status)) {
    return res.status(400).json({ error: 'Invalid or missing status' });
  }
  try {
    // Load existing fields for change detection if needed in future
    const [[before]] = await pool.query('SELECT location FROM consultations WHERE id = ?', [id]);

    const fields = ['status = ?'];
    let values = [status];
    if (declineReason !== undefined) { fields.push('decline_reason = ?'); values.push(declineReason || null); }
    if (cancelReason !== undefined) { fields.push('cancel_reason = ?'); values.push(cancelReason || null); }
    if (location !== undefined) { fields.push('location = ?'); values.push(location || null); }
    if (summaryNotes !== undefined) { fields.push('summary_notes = ?'); values.push(summaryNotes || null); }
    values.push(id);
    // If completing, stamp actual_end_datetime now
    let now = null;
    if (status === 'completed') {
      now = new Date();
      fields.push('actual_end_datetime = ?');
      values = [status, ...(declineReason !== undefined ? [declineReason || null] : []), ...(cancelReason !== undefined ? [cancelReason || null] : []), ...(location !== undefined ? [location || null] : []), ...(summaryNotes !== undefined ? [summaryNotes || null] : []), now, id];
    }
    const [result] = await pool.query(`UPDATE consultations SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // If completed, compute actual duration from actual_start/end and persist
    if (status === 'completed') {
      try {
        const [[row]] = await pool.query('SELECT actual_start_datetime, actual_end_datetime, start_datetime, end_datetime, duration_minutes FROM consultations WHERE id = ?', [id]);
        if (row) {
          const as = row.actual_start_datetime ? new Date(row.actual_start_datetime) : null;
          const ae = row.actual_end_datetime ? new Date(row.actual_end_datetime) : null;
          let durationMin = Number(row.duration_minutes || 0) || null;
          if (as && ae) {
            durationMin = Math.max(0, Math.round((ae.getTime() - as.getTime()) / 60000));
          } else if (!durationMin) {
            const ss = new Date(row.start_datetime);
            const ee = new Date(row.end_datetime);
            durationMin = Math.max(0, Math.round((ee.getTime() - ss.getTime()) / 60000));
          }
          await pool.query('UPDATE consultations SET duration_minutes = ? WHERE id = ?', [durationMin || null, id]);
        }
      } catch (err) {
        console.error('Failed to compute/persist actual duration on complete', err);
      }
    }

    // Create appropriate notification based on new status
    try {
      const [[c]] = await pool.query(
        `SELECT c.*, s.full_name AS student_name, a.full_name AS advisor_name
         FROM consultations c
         JOIN users s ON s.id = c.student_user_id
         JOIN users a ON a.id = c.advisor_user_id
         WHERE c.id = ?`, [id]
      );
      if (c) {
        const start = new Date(c.start_datetime);
        const end = new Date(c.end_datetime);
        const date = formatDate(start);
        const time = formatTimeRange(start, end);
        // Room readiness is handled via /consultations/:id/room-ready endpoint.
        // No meetingLink handling here to avoid undefined references.

        if (status === 'approved') {
          const title = `${c.advisor_name} approved your consultation`;
          const message = `Your consultation request for '${c.topic}' has been approved for ${date} at ${time}.`;
          await notify(pool, c.student_user_id, 'consultation_approved', title, message, { consultation_id: c.id });
        } else if (status === 'declined') {
          const title = `${c.advisor_name} declined your consultation`;
          const reasonText = declineReason || c.decline_reason || null;
          const message = `Your consultation request for '${c.topic}' has been declined.${reasonText ? ` Reason: ${reasonText}` : ''}`;
          const data = { consultation_id: c.id, decline_reason: reasonText };
          await notify(pool, c.student_user_id, 'consultation_declined', title, message, data);
        } else if (status === 'cancelled') {
          const title = `Consultation cancelled`;
          const reasonText = cancelReason || c.cancel_reason || null;
          const message = `The consultation for '${c.topic}' on ${date} at ${time} was cancelled.${reasonText ? ` Reason: ${reasonText}` : ''}`;
          const data = { consultation_id: c.id, cancel_reason: reasonText, cancellation_reason: reasonText };
          // Notify both parties to ensure visibility regardless of who initiated
          await notify(pool, c.advisor_user_id, 'consultation_cancelled', title, message, data);
          await notify(pool, c.student_user_id, 'consultation_cancelled', title, message, data);

          await pool.query(
            'UPDATE advisor_slots SET status = ? WHERE advisor_user_id = ? AND start_datetime = ? AND end_datetime = ? AND status = ?',
            ['available', c.advisor_user_id, c.start_datetime, c.end_datetime, 'booked']
          );
        } else if (status === 'missed') {
          // Neutral "missed" state replaces "no-show" without blaming either party
          const title = `Consultation missed`;
          // Compute minutes since scheduled start; cap at duration if available
          const elapsedMins = Math.max(0, Math.ceil((Date.now() - start.getTime()) / 60000));
          const scheduledDurationMins = c.duration_minutes || Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 60000));
          const minutesNoShow = Math.max(0, Math.min(elapsedMins, scheduledDurationMins));
          const detail = minutesNoShow > 0
            ? ` No-show duration: ${minutesNoShow} minute${minutesNoShow === 1 ? '' : 's'} from the scheduled start.`
            : '';
          const message = `The consultation '${c.topic}' scheduled for ${date} at ${time} was missed.${detail}`.trim();
          const data = { consultation_id: c.id, summary: summaryNotes || null, minutes_no_show: minutesNoShow, start_datetime: c.start_datetime, end_datetime: c.end_datetime };
          await notify(pool, c.student_user_id, 'consultation_missed', title, message, data);
          await notify(pool, c.advisor_user_id, 'consultation_missed', title, message, data);
        }
      }
    } catch (err) {
      console.error('Status change notification error', err);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Update consultation status error', err);
    res.status(500).json({ error: 'Failed to update consultation' });
  }
});

// Mark consultation as started (records actual_start_datetime)
// POST /api/consultations/:id/started
router.post('/consultations/:id/started', async (req, res) => {
  const pool = getPool();
  const id = req.params.id;
  try {
    const now = new Date();
    const [result] = await pool.query('UPDATE consultations SET actual_start_datetime = ? WHERE id = ?', [now, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Consultation not found' });
    }
    res.json({ success: true, started_at: now });
  } catch (err) {
    console.error('Mark started error', err);
    res.status(500).json({ error: 'Failed to mark consultation started' });
  }
});

// Advisor or approved Student updates AI summary (completed consultations)
// PATCH /api/consultations/:id/ai-summary { aiSummary }
router.patch('/consultations/:id/ai-summary', authMiddleware, async (req, res) => {
  const pool = getPool();
  const id = req.params.id;
  const { aiSummary } = req.body || {};
  const user = req.user || {};
  if (typeof aiSummary !== 'string') {
    return res.status(400).json({ error: 'aiSummary must be a string' });
  }
  try {
    await ensureSummaryApprovalColumn(pool);
    const [[c]] = await pool.query('SELECT advisor_user_id, student_user_id, topic FROM consultations WHERE id = ?', [id]);
    if (!c) return res.status(404).json({ error: 'Consultation not found' });
    const isAdvisor = user.role === 'advisor' && user.id === c.advisor_user_id;
    const isStudent = user.role === 'student' && user.id === c.student_user_id;

    // If advisor, always allowed. If student, require prior approval notification.
    if (!isAdvisor && !isStudent) {
      return res.status(403).json({ error: 'Only assigned advisor or student can edit the summary' });
    }

    if (isStudent) {
      // Strict per-consultation approval: prefer the persisted flag when available, fallback to exact notification match
      let flagApproved = false;
      try {
        const [[row]] = await pool.query('SELECT summary_edit_approved_at FROM consultations WHERE id = ?', [id]);
        flagApproved = !!row?.summary_edit_approved_at;
      } catch (_) {
        flagApproved = false;
      }
      if (!flagApproved) {
        const [rows] = await pool.query(
          `SELECT id, type, data_json FROM notifications WHERE user_id = ? AND type IN ('consultation_summary_edit_approved', 'summary_edit_approved') ORDER BY id DESC LIMIT 200`,
          [c.student_user_id]
        );
        let approved = false;
        for (const r of rows) {
          try {
            const data = r?.data_json ? JSON.parse(r.data_json) : {};
            if (Number(data?.consultation_id) === Number(id)) { approved = true; break; }
          } catch (_) {}
        }
        if (!approved) {
          return res.status(403).json({ error: 'Student edit not approved for this consultation' });
        }
      }
    }

    await pool.query('UPDATE consultations SET ai_summary = ? WHERE id = ?', [aiSummary, id]);

    // Notify the other party that summary was updated
    try {
      const notifyTarget = isAdvisor ? c.student_user_id : c.advisor_user_id;
      const who = isAdvisor ? 'advisor' : 'student';
      const title = 'Consultation summary updated';
      const message = `Your consultation summary for '${c.topic}' was updated by the ${who}.`;
      await notify(pool, notifyTarget, 'consultation_summary_updated', title, message, { consultation_id: Number(id) });
    } catch (_) {}
    return res.json({ success: true });
  } catch (err) {
    console.error('Update AI summary error:', err);
    return res.status(500).json({ error: 'Failed to update AI summary' });
  }
});

// Advisor or Student updates shared consultation notes
// PATCH /api/consultations/:id/summary-notes { summaryNotes }
router.patch('/consultations/:id/summary-notes', authMiddleware, async (req, res) => {
  const pool = getPool();
  const id = req.params.id;
  const { summaryNotes } = req.body || {};
  const user = req.user || {};
  if (typeof summaryNotes !== 'string') {
    return res.status(400).json({ error: 'summaryNotes must be a string' });
  }
  try {
    const [[c]] = await pool.query('SELECT advisor_user_id, student_user_id, topic FROM consultations WHERE id = ?', [id]);
    if (!c) return res.status(404).json({ error: 'Consultation not found' });
    const isAdvisor = user.role === 'advisor' && user.id === c.advisor_user_id;
    const isStudent = user.role === 'student' && user.id === c.student_user_id;
    if (!isAdvisor && !isStudent) {
      return res.status(403).json({ error: 'Only assigned advisor or student can edit notes' });
    }
    await pool.query('UPDATE consultations SET summary_notes = ? WHERE id = ?', [summaryNotes, id]);

    // Notify the other party that notes were updated
    try {
      const notifyTarget = isAdvisor ? c.student_user_id : c.advisor_user_id;
      await notify(pool, notifyTarget, 'consultation_notes_updated', 'Consultation notes updated', `Notes for '${c.topic}' were updated.`, { consultation_id: Number(id) });
    } catch (_) {}
    return res.json({ success: true });
  } catch (err) {
    console.error('Update summary notes error:', err);
    return res.status(500).json({ error: 'Failed to update summary notes' });
  }
});

// Notes columns: ensure new columns exist and migrate from legacy private columns
async function ensureNotesColumns(pool) {
  try {
    const [advisorNew] = await pool.query('SHOW COLUMNS FROM consultations LIKE "advisor_notes"');
    if (!advisorNew || advisorNew.length === 0) {
      try { await pool.query('ALTER TABLE consultations ADD COLUMN advisor_notes TEXT NULL'); } catch (_) {}
    }
  } catch (_) {}
  try {
    const [studentNew] = await pool.query('SHOW COLUMNS FROM consultations LIKE "student_notes"');
    if (!studentNew || studentNew.length === 0) {
      try { await pool.query('ALTER TABLE consultations ADD COLUMN student_notes TEXT NULL'); } catch (_) {}
    }
  } catch (_) {}
  // Best-effort migrate from legacy columns if present
  try {
    const [advisorLegacy] = await pool.query('SHOW COLUMNS FROM consultations LIKE "advisor_private_notes"');
    if (advisorLegacy && advisorLegacy.length) {
      try { await pool.query('UPDATE consultations SET advisor_notes = COALESCE(advisor_notes, advisor_private_notes) WHERE advisor_private_notes IS NOT NULL AND (advisor_notes IS NULL OR advisor_notes = "")'); } catch (_) {}
    }
  } catch (_) {}
  try {
    const [studentLegacy] = await pool.query('SHOW COLUMNS FROM consultations LIKE "student_private_notes"');
    if (studentLegacy && studentLegacy.length) {
      try { await pool.query('UPDATE consultations SET student_notes = COALESCE(student_notes, student_private_notes) WHERE student_private_notes IS NOT NULL AND (student_notes IS NULL OR student_notes = "")'); } catch (_) {}
    }
  } catch (_) {}
}

// Summary edit approval flag: ensure column exists to track per-consultation approvals
async function ensureSummaryApprovalColumn(pool) {
  try {
    const [cols] = await pool.query('SHOW COLUMNS FROM consultations LIKE "summary_edit_approved_at"');
    if (!cols || cols.length === 0) {
      try { await pool.query('ALTER TABLE consultations ADD COLUMN summary_edit_approved_at DATETIME NULL'); } catch (_) {}
    }
  } catch (_) {}
}

// Advisor updates private notes (not shared with student)
// PATCH /api/consultations/:id/advisor-notes { advisorNotes }
router.patch('/consultations/:id/advisor-notes', authMiddleware, async (req, res) => {
  const pool = getPool();
  const id = req.params.id;
  const { advisorNotes } = req.body || {};
  const user = req.user || {};
  if (typeof advisorNotes !== 'string') {
    return res.status(400).json({ error: 'advisorNotes must be a string' });
  }
  try {
    const [[c]] = await pool.query('SELECT advisor_user_id, student_user_id, topic FROM consultations WHERE id = ?', [id]);
    if (!c) return res.status(404).json({ error: 'Consultation not found' });
    const isAdvisor = user.role === 'advisor' && user.id === c.advisor_user_id;
    if (!isAdvisor) {
      return res.status(403).json({ error: 'Only the assigned advisor can edit advisor notes' });
    }
    await ensureNotesColumns(pool);
    await pool.query('UPDATE consultations SET advisor_notes = ? WHERE id = ?', [advisorNotes, id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('Update advisor notes error:', err);
    return res.status(500).json({ error: 'Failed to update advisor notes' });
  }
});

// Student updates private notes (not shared with advisor)
// PATCH /api/consultations/:id/student-notes { studentNotes }
router.patch('/consultations/:id/student-notes', authMiddleware, async (req, res) => {
  const pool = getPool();
  const id = req.params.id;
  const { studentNotes } = req.body || {};
  const user = req.user || {};
  if (typeof studentNotes !== 'string') {
    return res.status(400).json({ error: 'studentNotes must be a string' });
  }
  try {
    const [[c]] = await pool.query('SELECT advisor_user_id, student_user_id, topic FROM consultations WHERE id = ?', [id]);
    if (!c) return res.status(404).json({ error: 'Consultation not found' });
    const isStudent = user.role === 'student' && user.id === c.student_user_id;
    if (!isStudent) {
      return res.status(403).json({ error: 'Only the assigned student can edit student notes' });
    }
    await ensureNotesColumns(pool);
    await pool.query('UPDATE consultations SET student_private_notes = ? WHERE id = ?', [studentNotes, id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('Update student notes error:', err);
    return res.status(500).json({ error: 'Failed to update student notes' });
  }
});

// Student requests an edit to the summary
// POST /api/consultations/:id/summary-edit-request { reason? }
router.post('/consultations/:id/summary-edit-request', authMiddleware, async (req, res) => {
  const pool = getPool();
  const id = req.params.id;
  const { reason } = req.body || {};
  const user = req.user || {};
  try {
    const [[c]] = await pool.query('SELECT advisor_user_id, student_user_id, topic FROM consultations WHERE id = ?', [id]);
    if (!c) return res.status(404).json({ error: 'Consultation not found' });
    if (user.role !== 'student' || user.id !== c.student_user_id) {
      return res.status(403).json({ error: 'Only the assigned student can request an edit' });
    }
    const title = 'Student requested summary edit';
    const message = `Student requested an edit to the summary for '${c.topic}'.`;
    const data = { consultation_id: Number(id), reason: reason || null };
    await notify(pool, c.advisor_user_id, 'consultation_summary_edit_requested', title, message, data);
    return res.json({ success: true });
  } catch (err) {
    console.error('Summary edit request error:', err);
    return res.status(500).json({ error: 'Failed to submit summary edit request' });
  }
});

// Advisor approves a student's summary edit request
// POST /api/consultations/:id/summary-edit-approve { note? }
router.post('/consultations/:id/summary-edit-approve', authMiddleware, async (req, res) => {
  const pool = getPool();
  const id = req.params.id;
  const { note } = req.body || {};
  const user = req.user || {};
  try {
    const [[c]] = await pool.query('SELECT advisor_user_id, student_user_id, topic FROM consultations WHERE id = ?', [id]);
    if (!c) return res.status(404).json({ error: 'Consultation not found' });
    if (user.role !== 'advisor' || user.id !== c.advisor_user_id) {
      return res.status(403).json({ error: 'Only the assigned advisor can approve requests' });
    }
    const title = 'Your summary edit was approved';
    const message = `Advisor approved your summary edit request for '${c.topic}'.`;
    const data = { consultation_id: Number(id), note: note || null };
    await notify(pool, c.student_user_id, 'consultation_summary_edit_approved', title, message, data);
    // Persist per-consultation approval flag
    try {
      await ensureSummaryApprovalColumn(pool);
      await pool.query('UPDATE consultations SET summary_edit_approved_at = NOW() WHERE id = ?', [id]);
    } catch (_) {}
    return res.json({ success: true });
  } catch (err) {
    console.error('Summary edit approve error:', err);
    return res.status(500).json({ error: 'Failed to approve summary edit request' });
  }
});

// Advisor declines a student's summary edit request
// POST /api/consultations/:id/summary-edit-decline { reason? }
router.post('/consultations/:id/summary-edit-decline', authMiddleware, async (req, res) => {
  const pool = getPool();
  const id = req.params.id;
  const { reason } = req.body || {};
  const user = req.user || {};
  try {
    const [[c]] = await pool.query('SELECT advisor_user_id, student_user_id, topic FROM consultations WHERE id = ?', [id]);
    if (!c) return res.status(404).json({ error: 'Consultation not found' });
    if (user.role !== 'advisor' || user.id !== c.advisor_user_id) {
      return res.status(403).json({ error: 'Only the assigned advisor can decline requests' });
    }
    const title = 'Your summary edit was declined';
    const message = `Advisor declined your summary edit request for '${c.topic}'.`;
    const data = { consultation_id: Number(id), reason: reason || null };
    await notify(pool, c.student_user_id, 'consultation_summary_edit_declined', title, message, data);
    // Clear per-consultation approval flag on decline
    try {
      await ensureSummaryApprovalColumn(pool);
      await pool.query('UPDATE consultations SET summary_edit_approved_at = NULL WHERE id = ?', [id]);
    } catch (_) {}
    return res.json({ success: true });
  } catch (err) {
    console.error('Summary edit decline error:', err);
    return res.status(500).json({ error: 'Failed to decline summary edit request' });
  }
});

// Update consultation details (reschedule/edit)
// PATCH /api/consultations/:id
// Body may include: {
//   topic, category, mode, location, student_notes,
//   start_datetime, end_datetime, slot_id
// }
router.patch('/consultations/:id', async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();
  const id = req.params.id;
  const body = req.body || {};
  try {
    // Load consultation to get advisor/student ids for notifications
    const [[existing]] = await pool.query('SELECT * FROM consultations WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    const fields = [];
    const values = [];

    const topic = body.topic;
    const category = body.category;
    const mode = body.mode; // 'online' | 'in-person'
    const location = body.location;
    const notes = body.student_notes;
    const startIso = body.start_datetime;
    const endIso = body.end_datetime;
    const slotId = body.slot_id || null;

    // Compute duration if datetime provided
    let startDate = null;
    let endDate = null;
    const parseUtcMySQL = (val) => {
      if (!val) return null;
      if (val instanceof Date) return val;
      const s = String(val).trim();
      if (!s) return null;
      if (/([zZ]|[+\-]\d{2}:?\d{2})$/.test(s)) {
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
      }
      const cleaned = s.replace(' ', 'T');
      const d = new Date(`${cleaned}Z`);
      return isNaN(d.getTime()) ? null : d;
    };
    if (startIso) {
      startDate = parseUtcMySQL(startIso);
      if (!startDate) return res.status(400).json({ error: 'Invalid start_datetime' });
      fields.push('start_datetime = ?'); values.push(startDate);
    }
    if (endIso) {
      endDate = parseUtcMySQL(endIso);
      if (!endDate) return res.status(400).json({ error: 'Invalid end_datetime' });
      fields.push('end_datetime = ?'); values.push(endDate);
    }
    if (startDate && endDate) {
      const duration = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
      fields.push('duration_minutes = ?'); values.push(duration || null);
    }
    if (topic !== undefined) { fields.push('topic = ?'); values.push(topic || null); }
    if (category !== undefined) { fields.push('category = ?'); values.push(category || null); }
    if (mode !== undefined) {
      const modeNorm = String(mode).toLowerCase() === 'in-person' ? 'in-person' : 'online';
      fields.push('mode = ?'); values.push(modeNorm);
    }
    if (location !== undefined) { fields.push('location = ?'); values.push(location || null); }
    if (notes !== undefined) { fields.push('student_notes = ?'); values.push(notes || null); }

    // On reschedule/edit, reset status to pending
    fields.push('status = ?'); values.push('pending');
    // Clear decline/cancel reasons on edit
    fields.push('decline_reason = ?'); values.push(null);
    fields.push('cancel_reason = ?'); values.push(null);

    await conn.beginTransaction();

    // If a slot_id is provided, ensure it is available and then mark booked
    if (slotId) {
      const [sRows] = await conn.query('SELECT status FROM advisor_slots WHERE id = ? FOR UPDATE', [slotId]);
      if (!sRows.length) {
        await conn.rollback();
        return res.status(404).json({ error: 'Advisor slot not found' });
      }
      const s = sRows[0];
      const currStatus = String(s.status || '').toLowerCase();
      if (currStatus !== 'available') {
        await conn.rollback();
        return res.status(409).json({ error: 'Slot is no longer available' });
      }
      await conn.query('UPDATE advisor_slots SET status = ? WHERE id = ?', ['booked', slotId]);
    }

    // Apply updates
    values.push(id);
    const [result] = await conn.query(`UPDATE consultations SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Consultation not found' });
    }

    await conn.commit();

    // Notify advisor about rescheduled request
    try {
      const [[c]] = await pool.query(
        `SELECT c.*, s.full_name AS student_name, a.full_name AS advisor_name
         FROM consultations c
         JOIN users s ON s.id = c.student_user_id
         JOIN users a ON a.id = c.advisor_user_id
         WHERE c.id = ?`, [id]
      );
      if (c) {
        const start = new Date(c.start_datetime);
        const end = new Date(c.end_datetime);
        const date = formatDate(start);
        const time = formatTimeRange(start, end);
        const title = `${c.student_name} rescheduled a consultation`;
        const message = `${c.student_name} requested '${c.topic}' on ${date} at ${time}.`;
        const changes = [];
        if (body.start_datetime && body.end_datetime) changes.push('time');
        if (body.location !== undefined) changes.push('location');
        if (body.mode !== undefined) changes.push('mode');
        const data = { consultation_id: c.id, changed: changes, date, time, location: c.location || null, mode: c.mode || null };
        await notify(pool, c.advisor_user_id, 'consultation_rescheduled', title, message, data);
        // Also notify student for visibility of confirmed changes
        await notify(pool, c.student_user_id, 'consultation_rescheduled', 'Consultation updated', `Your consultation '${c.topic}' was updated to ${date} at ${time}.`, data);
      }
    } catch (err) {
      console.error('Reschedule notification error', err);
    }

    // Return updated consultation in student shape
    const [[r]] = await pool.query(
      `SELECT c.*, u.full_name AS advisor_name, ap.title AS advisor_title, ap.avatar_url AS advisor_avatar_url
       FROM consultations c
       JOIN users u ON u.id = c.advisor_user_id
       LEFT JOIN advisor_profiles ap ON ap.user_id = u.id
       WHERE c.id = ?`, [id]
    );
    const start = new Date(r.start_datetime);
    const end = new Date(r.end_datetime);
    const date = formatDate(start);
    const time = formatTimeRange(start, end);
    const [guidelines] = await pool.query('SELECT guideline_text FROM consultation_guidelines WHERE consultation_id = ?', [r.id]);
  return res.json({
      id: r.id,
      date,
      time,
      start_datetime: r.start_datetime,
      end_datetime: r.end_datetime,
      topic: r.topic,
      faculty: {
        id: r.advisor_user_id,
        name: r.advisor_name,
        title: r.advisor_title,
        avatar_url: r.advisor_avatar_url || null,
      },
      mode: r.mode,
      status: r.status,
      roomName: r.room_name || undefined,
      location: r.location || undefined,
      studentNotes: r.student_notes || undefined,
      studentPrivateNotes: r.student_private_notes || undefined,
      summaryNotes: r.summary_notes || undefined,
      duration: (r.actual_start_datetime && r.actual_end_datetime)
        ? Math.max(0, Math.round((new Date(r.actual_end_datetime).getTime() - new Date(r.actual_start_datetime).getTime()) / 60000))
        : (Number(r.duration_minutes || 0) || Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))),
      bookingDate: r.booking_date,
      guidelines: guidelines.map(g => g.guideline_text),
    });
  } catch (err) {
    console.error('Update consultation details error', err);
    try { await conn.rollback(); } catch (_) {}
    res.status(500).json({ error: 'Failed to update consultation' });
  } finally {
    conn.release();
  }
});

// Advisor starts online call or meeting link becomes available
// POST /api/consultations/:id/room-ready
router.post('/consultations/:id/room-ready', async (req, res) => {
  const pool = getPool();
  const id = req.params.id;
  const { meetingLink } = req.body || {};
  try {
    const [[c]] = await pool.query(
      `SELECT c.*, s.full_name AS student_name, a.full_name AS advisor_name
       FROM consultations c
       JOIN users s ON s.id = c.student_user_id
       JOIN users a ON a.id = c.advisor_user_id
       WHERE c.id = ?`, [id]
    );
    if (!c) return res.status(404).json({ error: 'Consultation not found' });

    // meeting_link deprecated; ignore any provided meetingLink

    // Persist room_name using the standard pattern advisys-<id> when missing
    const roomName = c.room_name || `advisys-${c.id}`;
    if (!c.room_name) {
      await pool.query('UPDATE consultations SET room_name = ? WHERE id = ?', [roomName, id]);
      c.room_name = roomName;
    }

    const start = new Date(c.start_datetime);
    const end = new Date(c.end_datetime);
    const date = formatDate(start);
    const time = formatTimeRange(start, end);
    const title = `Online meeting room is ready`;
    const msg = `Your consultation '${c.topic}' on ${date} at ${time} has an active meeting room. You can join when ready.`;
    const data = { consultation_id: c.id, room_name: c.room_name };
    await notify(pool, c.student_user_id, 'consultation_room_ready', title, msg, data);
    res.json({ success: true });
  } catch (err) {
    console.error('Room-ready endpoint error', err);
    res.status(500).json({ error: 'Failed to mark room ready' });
  }
});

// Delete disabled: consultations are records and cannot be deleted
router.delete('/consultations/:id', async (req, res) => {
  return res.status(405).json({ error: 'Consultation deletion is disabled. Use cancel or archive policies instead.' });
});

// List advisors a student has consulted with (counterparts)
router.get('/consultations/students/:studentId/counterparts', authMiddleware, async (req, res) => {
  const pool = getPool();
  try {
    const studentId = Number(req.params.studentId);
    const { termId, term } = req.query || {};
    let where = 'WHERE c.student_user_id = ?';
    const params = [studentId];
    if (String(term).toLowerCase() !== 'all') {
      let t = Number(termId) || null;
      if (!t) {
        const [[curr]] = await pool.query('SELECT id FROM academic_terms WHERE is_current = 1 LIMIT 1');
        t = curr?.id || null;
      }
      if (t) { where += ' AND c.academic_term_id = ?'; params.push(t); }
    }
    const [rows] = await pool.query(
      `SELECT c.advisor_user_id AS id,
              u.full_name AS name,
              ap.title,
              ap.avatar_url,
              COUNT(*) AS count,
              MAX(c.start_datetime) AS last_date
       FROM consultations c
       JOIN users u ON u.id = c.advisor_user_id
       JOIN advisor_profiles ap ON ap.user_id = u.id
       ${where}
       GROUP BY c.advisor_user_id, u.full_name, ap.title, ap.avatar_url
       ORDER BY last_date DESC`,
      params
    );
    res.json(rows || []);
  } catch (err) {
    console.error('Failed to fetch student counterparts:', err);
    res.status(500).json({ error: 'Failed to fetch counterparts' });
  }
});

// List students an advisor has consulted with (counterparts)
router.get('/consultations/advisors/:advisorId/counterparts', authMiddleware, async (req, res) => {
  const pool = getPool();
  try {
    const advisorId = Number(req.params.advisorId);
    const { termId, term } = req.query || {};
    let where = 'WHERE c.advisor_user_id = ?';
    const params = [advisorId];
    if (String(term).toLowerCase() !== 'all') {
      let t = Number(termId) || null;
      if (!t) {
        const [[curr]] = await pool.query('SELECT id FROM academic_terms WHERE is_current = 1 LIMIT 1');
        t = curr?.id || null;
      }
      if (t) { where += ' AND c.academic_term_id = ?'; params.push(t); }
    }
    const [rows] = await pool.query(
      `SELECT c.student_user_id AS id,
              u.full_name AS name,
              sp.program,
              sp.year_level,
              sp.avatar_url,
              COUNT(*) AS count,
              MAX(c.start_datetime) AS last_date
       FROM consultations c
       JOIN users u ON u.id = c.student_user_id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       ${where}
       GROUP BY c.student_user_id, u.full_name, sp.program, sp.year_level, sp.avatar_url
       ORDER BY last_date DESC`,
      params
    );
    res.json(rows || []);
  } catch (err) {
    console.error('Failed to fetch advisor counterparts:', err);
    res.status(500).json({ error: 'Failed to fetch counterparts' });
  }
});

// Thread list between a student and advisor
router.get('/consultations/thread', authMiddleware, async (req, res) => {
  const pool = getPool();
  try {
    const { studentId, advisorId, termId, term } = req.query || {};
    const sid = Number(studentId);
    const aid = Number(advisorId);
    if (!sid || !aid) return res.status(400).json({ error: 'studentId and advisorId are required' });
    let where = 'WHERE c.student_user_id = ? AND c.advisor_user_id = ?';
    const params = [sid, aid];
    if (String(term).toLowerCase() !== 'all') {
      let t = Number(termId) || null;
      if (!t) {
        const [[curr]] = await pool.query('SELECT id FROM academic_terms WHERE is_current = 1 LIMIT 1');
        t = curr?.id || null;
      }
      if (t) { where += ' AND c.academic_term_id = ?'; params.push(t); }
    }
    const [rows] = await pool.query(
      `SELECT c.*,
              su.full_name AS student_name, sp.program AS student_program, sp.year_level AS student_year, sp.avatar_url AS student_avatar_url,
              au.full_name AS advisor_name, ap.title AS advisor_title, ap.avatar_url AS advisor_avatar_url
       FROM consultations c
       JOIN users su ON su.id = c.student_user_id
       LEFT JOIN student_profiles sp ON sp.user_id = su.id
       JOIN users au ON au.id = c.advisor_user_id
       LEFT JOIN advisor_profiles ap ON ap.user_id = au.id
       ${where}
       ORDER BY c.start_datetime ASC`,
      params
    );
    const role = String(req.user?.role || '').toLowerCase();
    const sanitized = (rows || []).map(r => {
      const o = { ...r };
      if (role === 'student') {
        delete o.advisor_private_notes;
        // Keep only student notes (support legacy/new columns)
        o.student_notes = (o.student_notes != null ? o.student_notes : o.student_private_notes) || null;
      } else if (role === 'advisor') {
        delete o.student_private_notes;
        // Keep only advisor notes (support legacy/new columns)
        o.advisor_notes = (o.advisor_notes != null ? o.advisor_notes : o.advisor_private_notes) || null;
      } else {
        delete o.student_private_notes;
        delete o.advisor_private_notes;
      }
      return o;
    });
    res.json(sanitized);
  } catch (err) {
    console.error('Failed to fetch thread:', err);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});
module.exports = router;
