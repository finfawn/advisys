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

module.exports = router;