const express = require('express');
const { getPool } = require('../db/pool');

const router = express.Router();

async function createNotification(poolOrConn, userId, type, title, message, data = null) {
  try {
    const dataJson = data ? JSON.stringify(data) : null;
    await poolOrConn.query(
      `INSERT INTO notifications (user_id, type, title, message, data_json) VALUES (?,?,?,?,?)`,
      [userId, type, title, message, dataJson]
    );
  } catch (err) {
    console.error('Failed to create notification:', err?.message || err);
  }
}

function formatDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function formatTimeRange(start, end) {
  function fmt(d) {
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  return `${fmt(start)} - ${fmt(end)}`;
}

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

    // Compute duration in minutes
    const start = new Date(startIso);
    const end = new Date(endIso);
    const durationMin = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

    // Insert consultation
    const [insertRes] = await conn.query(
      `INSERT INTO consultations
       (student_user_id, advisor_user_id, topic, category, mode, location, student_notes, start_datetime, end_datetime, duration_minutes, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
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
      ]
    );

    const newId = insertRes.insertId;
    await conn.commit();

    // Return the newly created consultation in the same shape as GET endpoints
    const [rows] = await pool.query(
      `SELECT c.*, u.full_name AS advisor_name, ap.title AS advisor_title
       FROM consultations c
       JOIN users u ON u.id = c.advisor_user_id
       JOIN advisor_profiles ap ON ap.user_id = u.id
       WHERE c.id = ?`, [newId]
    );
    if (!rows.length) {
      return res.status(500).json({ error: 'Failed to load created consultation' });
    }
    const r = rows[0];
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
      await createNotification(pool, advisorId, 'consultation_request', title, message, {
        consultation_id: newId,
        date,
        time,
        topic,
        mode: modeNorm,
      });
    } catch (err) {
      console.error('Advisor request notification error', err);
    }
    return res.status(201).json({
      id: r.id,
      date,
      time,
      topic: r.topic,
      faculty: {
        name: r.advisor_name,
        title: r.advisor_title,
      },
      mode: r.mode,
      status: r.status,
      meetingLink: r.meeting_link || undefined,
      location: r.location || undefined,
      duration: r.duration_minutes || 30,
      bookingDate: r.booking_date,
      guidelines: [],
    });
  } catch (err) {
    console.error('Create consultation error', err);
    try { await conn.rollback(); } catch (_) {}
    res.status(500).json({ error: 'Failed to create consultation' });
  } finally {
    conn.release();
  }
});

router.get('/students/:studentId/consultations', async (req, res) => {
  const pool = getPool();
  try {
    const studentId = req.params.studentId;
    const [rows] = await pool.query(
      `SELECT c.*, u.full_name AS advisor_name, ap.title AS advisor_title
       FROM consultations c
       JOIN users u ON u.id = c.advisor_user_id
       JOIN advisor_profiles ap ON ap.user_id = u.id
       WHERE c.student_user_id = ?
       ORDER BY c.start_datetime ASC`, [studentId]
    );
    const result = [];
    for (const r of rows) {
      const start = new Date(r.start_datetime);
      const end = new Date(r.end_datetime);
      const date = formatDate(start);
      const time = formatTimeRange(start, end);
      const [guidelines] = await pool.query('SELECT guideline_text FROM consultation_guidelines WHERE consultation_id = ?', [r.id]);
      result.push({
        id: r.id,
        date,
        time,
        // Include raw datetimes for prefill/edit scenarios
        start_datetime: r.start_datetime,
        end_datetime: r.end_datetime,
        // Retain original category and notes for editing
        category: r.category || undefined,
        student_notes: r.student_notes || undefined,
        studentNotes: r.student_notes || undefined,
        topic: r.topic,
        faculty: {
          id: r.advisor_user_id,
          name: r.advisor_name,
          title: r.advisor_title,
        },
        mode: r.mode,
        status: r.status,
        meetingLink: r.meeting_link || undefined,
        location: r.location || undefined,
        declineReason: r.decline_reason || undefined,
        duration: r.duration_minutes || 30,
        bookingDate: r.booking_date,
        guidelines: guidelines.map(g => g.guideline_text),
      });
    }
    res.json(result);
  } catch (err) {
    console.error('Student consultations error', err);
    res.status(500).json({ error: 'Failed to load consultations' });
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
router.get('/advisors/:advisorId/consultations', async (req, res) => {
  const pool = getPool();
  try {
    const advisorId = req.params.advisorId;
    const [rows] = await pool.query(
      `SELECT c.*, u.full_name AS student_name, sp.program AS student_program, sp.year_level AS student_year
       FROM consultations c
       JOIN users u ON u.id = c.student_user_id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE c.advisor_user_id = ?
       ORDER BY c.start_datetime ASC`, [advisorId]
    );

    const result = [];
    for (const r of rows) {
      const start = new Date(r.start_datetime);
      const end = new Date(r.end_datetime);
      const date = formatDate(start);
      const time = formatTimeRange(start, end);
      const [guidelines] = await pool.query('SELECT guideline_text FROM consultation_guidelines WHERE consultation_id = ?', [r.id]);
      const course = r.student_program ? `${r.student_program} - ${yearLabel(r.student_year || 1)}` : yearLabel(r.student_year || 1);
      result.push({
        id: r.id,
        date,
        time,
        topic: r.topic,
        student: {
          name: r.student_name,
          course,
        },
        mode: r.mode,
        status: r.status,
        meetingLink: r.meeting_link || undefined,
        location: r.location || undefined,
        declineReason: r.decline_reason || undefined,
        duration: r.duration_minutes || 30,
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
  const { status, meetingLink, declineReason, cancelReason, location } = req.body || {};
  const allowed = new Set(['pending','approved','declined','completed','cancelled','no-show']);
  if (!status || !allowed.has(status)) {
    return res.status(400).json({ error: 'Invalid or missing status' });
  }
  try {
    const fields = ['status = ?'];
    const values = [status];
    if (meetingLink !== undefined) { fields.push('meeting_link = ?'); values.push(meetingLink || null); }
    if (declineReason !== undefined) { fields.push('decline_reason = ?'); values.push(declineReason || null); }
    if (cancelReason !== undefined) { fields.push('cancel_reason = ?'); values.push(cancelReason || null); }
    if (location !== undefined) { fields.push('location = ?'); values.push(location || null); }
    values.push(id);
    const [result] = await pool.query(`UPDATE consultations SET ${fields.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Consultation not found' });
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
        if (status === 'approved') {
          const title = `${c.advisor_name} approved your consultation`;
          const message = `Your consultation request for '${c.topic}' has been approved for ${date} at ${time}.`;
          await createNotification(pool, c.student_user_id, 'consultation_approved', title, message, { consultation_id: c.id });
        } else if (status === 'declined') {
          const title = `${c.advisor_name} declined your consultation`;
          const reason = declineReason ? ` Reason: ${declineReason}` : '';
          const message = `Your consultation request for '${c.topic}' has been declined.${reason}`;
          await createNotification(pool, c.student_user_id, 'consultation_declined', title, message, { consultation_id: c.id });
        } else if (status === 'cancelled') {
          const title = `Consultation cancelled`;
          const message = `The consultation for '${c.topic}' on ${date} at ${time} was cancelled.`;
          // Notify the other party (advisor)
          await createNotification(pool, c.advisor_user_id, 'consultation_cancelled', title, message, { consultation_id: c.id });
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
    if (startIso) {
      startDate = new Date(startIso);
      if (isNaN(startDate.getTime())) return res.status(400).json({ error: 'Invalid start_datetime' });
      fields.push('start_datetime = ?'); values.push(startDate);
    }
    if (endIso) {
      endDate = new Date(endIso);
      if (isNaN(endDate.getTime())) return res.status(400).json({ error: 'Invalid end_datetime' });
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
        await createNotification(pool, c.advisor_user_id, 'consultation_rescheduled', title, message, { consultation_id: c.id });
      }
    } catch (err) {
      console.error('Reschedule notification error', err);
    }

    // Return updated consultation in student shape
    const [[r]] = await pool.query(
      `SELECT c.*, u.full_name AS advisor_name, ap.title AS advisor_title
       FROM consultations c
       JOIN users u ON u.id = c.advisor_user_id
       JOIN advisor_profiles ap ON ap.user_id = u.id
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
      },
      mode: r.mode,
      status: r.status,
      meetingLink: r.meeting_link || undefined,
      location: r.location || undefined,
      duration: r.duration_minutes || 30,
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

// Delete a consultation (use sparingly; consider soft-delete in future)
router.delete('/consultations/:id', async (req, res) => {
  const pool = getPool();
  const id = req.params.id;
  try {
    const [result] = await pool.query('DELETE FROM consultations WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Consultation not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete consultation error', err);
    res.status(500).json({ error: 'Failed to delete consultation' });
  }
});

module.exports = router;
