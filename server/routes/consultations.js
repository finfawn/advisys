const express = require('express');
const { getPool } = require('../db/pool');

const router = express.Router();

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
        topic: r.topic,
        faculty: {
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
    res.json({ success: true });
  } catch (err) {
    console.error('Update consultation status error', err);
    res.status(500).json({ error: 'Failed to update consultation' });
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
