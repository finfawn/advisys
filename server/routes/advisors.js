const express = require('express');
const { getPool } = require('../db/pool');

const router = express.Router();

function dayLabel(dow) {
  const map = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
  };
  return map[dow] || dow;
}

function formatTimeRange(rows) {
  if (!rows || rows.length === 0) return null;
  // Get earliest start and latest end across availabilities
  const toMinutes = (t) => parseInt(t.split(':')[0], 10) * 60 + parseInt(t.split(':')[1], 10);
  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const r of rows) {
    const s = toMinutes(r.start_time);
    const e = toMinutes(r.end_time);
    minStart = Math.min(minStart, s);
    maxEnd = Math.max(maxEnd, e);
  }
  function fmt(m) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
  }
  return `${fmt(minStart)}–${fmt(maxEnd)}`;
}

router.get('/', async (req, res) => {
  const pool = getPool();
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, ap.title, ap.department, ap.status
       FROM users u
       JOIN advisor_profiles ap ON ap.user_id = u.id
       WHERE u.role = 'advisor' AND u.status = 'active'`
    );
    const result = [];
    for (const row of rows) {
      const [avail] = await pool.query('SELECT day_of_week, start_time, end_time FROM advisor_availability WHERE advisor_user_id = ?', [row.id]);
      const [modes] = await pool.query('SELECT online_enabled, in_person_enabled FROM advisor_modes WHERE advisor_user_id = ?', [row.id]);
      const scheduleDays = avail.map(a => dayLabel(a.day_of_week)).join(', ');
      const timeRange = formatTimeRange(avail);
      let modeStr = 'Online';
      if (modes && modes[0]) {
        const m = modes[0];
        if (m.online_enabled && m.in_person_enabled) modeStr = 'In-person/Online';
        else if (m.in_person_enabled) modeStr = 'In-person';
        else modeStr = 'Online';
      }
      result.push({
        id: row.id,
        name: row.full_name,
        title: row.title,
        department: row.department,
        status: 'Available', // UI-friendly
        schedule: scheduleDays,
        time: timeRange,
        mode: modeStr,
      });
    }
    res.json(result);
  } catch (err) {
    console.error('Advisors list error', err);
    res.status(500).json({ error: 'Failed to load advisors' });
  }
});

router.get('/:id', async (req, res) => {
  const pool = getPool();
  try {
    const advisorId = req.params.id;
    const [[u]] = await pool.query(
      `SELECT u.id, u.full_name, ap.title, ap.department, ap.bio
       FROM users u JOIN advisor_profiles ap ON ap.user_id = u.id
       WHERE u.id = ? AND u.role='advisor'`, [advisorId]
    );
    if (!u) return res.status(404).json({ error: 'Advisor not found' });

    const [topics] = await pool.query('SELECT topic FROM advisor_topics WHERE advisor_user_id=?', [advisorId]);
    const [guidelines] = await pool.query('SELECT guideline_text FROM advisor_guidelines WHERE advisor_user_id=?', [advisorId]);
    const [courses] = await pool.query('SELECT course_name FROM advisor_courses WHERE advisor_user_id=?', [advisorId]);
    const [modes] = await pool.query('SELECT online_enabled, in_person_enabled FROM advisor_modes WHERE advisor_user_id=?', [advisorId]);
    const [avail] = await pool.query('SELECT day_of_week, start_time, end_time FROM advisor_availability WHERE advisor_user_id=?', [advisorId]);

    const weeklySchedule = {
      monday: 'Unavailable', tuesday: 'Unavailable', wednesday: 'Unavailable', thursday: 'Unavailable', friday: 'Unavailable', saturday: 'Unavailable', sunday: 'Unavailable'
    };
    for (const a of avail) {
      const key = a.day_of_week;
      function fmt(time) {
        const [h, m] = time.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = (h % 12) || 12;
        return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
      }
      weeklySchedule[key] = `${fmt(a.start_time)} - ${fmt(a.end_time)}`;
    }

    const consultationMode = [];
    if (modes && modes[0]) {
      if (modes[0].in_person_enabled) consultationMode.push('In-person');
      if (modes[0].online_enabled) consultationMode.push('Online');
    }

    res.json({
      id: u.id,
      name: u.full_name,
      title: u.title,
      department: u.department,
      bio: u.bio,
      topicsCanHelpWith: topics.map(t => t.topic),
      consultationGuidelines: guidelines.map(g => g.guideline_text),
      coursesTaught: courses.map(c => c.course_name),
      weeklySchedule,
      consultationMode,
      nextAvailableSlot: null,
    });
  } catch (err) {
    console.error('Advisor detail error', err);
    res.status(500).json({ error: 'Failed to load advisor' });
  }
});

module.exports = router;