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
      `SELECT u.id, u.full_name, ap.title, ap.department, ap.bio, ap.office_location
       FROM users u JOIN advisor_profiles ap ON ap.user_id = u.id
       WHERE u.id = ? AND u.role='advisor'`, [advisorId]
    );
    if (!u) return res.status(404).json({ error: 'Advisor not found' });

    const [topics] = await pool.query('SELECT topic FROM advisor_topics WHERE advisor_user_id=?', [advisorId]);
    const [guidelines] = await pool.query('SELECT guideline_text FROM advisor_guidelines WHERE advisor_user_id=?', [advisorId]);
    const [courses] = await pool.query('SELECT subject_code, subject_name, course_name FROM advisor_courses WHERE advisor_user_id=?', [advisorId]);
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
      officeLocation: u.office_location || null,
      topicsCanHelpWith: topics.map(t => t.topic),
      consultationGuidelines: guidelines.map(g => g.guideline_text),
      coursesTaught: courses.map(c => ({
        code: c.subject_code || null,
        name: c.subject_name || c.course_name || null,
      })),
      weeklySchedule,
      consultationMode,
      nextAvailableSlot: null,
    });
  } catch (err) {
    console.error('Advisor detail error', err);
    res.status(500).json({ error: 'Failed to load advisor' });
  }
});

// Normalize incoming mode values
const normalizeMode = (mode) => {
  if (!mode) return 'online';
  const m = String(mode).toLowerCase();
  if (m === 'face_to_face' || m === 'in-person' || m === 'in_person') return 'face_to_face';
  if (m === 'hybrid' || m === 'both') return 'hybrid';
  return 'online';
};

// GET /api/advisors/:id/slots
// Supports:
// - ?date=YYYY-MM-DD (single day)
// - ?month=YYYY-MM (entire month)
// - ?start=YYYY-MM-DD&end=YYYY-MM-DD (inclusive range)
router.get('/:id/slots', async (req, res) => {
  const pool = getPool();
  try {
    const advisorId = req.params.id;
    const { date, month, start, end } = req.query;

    // Cleanup: delete any slots whose end time has passed (for this advisor)
    // This ensures past-time slots disappear immediately, even on the current day.
    try {
      await pool.query(
        `DELETE FROM advisor_slots
         WHERE advisor_user_id = ?
           AND end_datetime <= NOW()`,
        [advisorId]
      );
    } catch (cleanupErr) {
      console.error('Advisor slots cleanup error', cleanupErr);
      // Non-fatal: continue to fetch remaining slots
    }

    // Helper to pad numbers
    const pad = (n) => String(n).padStart(2, '0');

    let query = '';
    let params = [];

    if (date) {
      // Single day (exclude past days)
      query = `SELECT id, start_datetime, end_datetime, mode, room, status
               FROM advisor_slots
               WHERE advisor_user_id = ? AND DATE(start_datetime) = ? AND DATE(start_datetime) >= CURDATE()
               ORDER BY start_datetime ASC`;
      params = [advisorId, date];
    } else if (month) {
      // Month range (inclusive)
      const [yStr, mStr] = month.split('-');
      const year = Number(yStr);
      const monthIdx = Number(mStr) - 1; // 0-based
      if (Number.isNaN(year) || Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) {
        return res.status(400).json({ error: 'Invalid month format. Expected YYYY-MM' });
      }
      const monthStart = `${year}-${pad(monthIdx + 1)}-01`;
      const lastDay = new Date(year, monthIdx + 1, 0).getDate();
      const monthEnd = `${year}-${pad(monthIdx + 1)}-${pad(lastDay)}`;
      // Exclude past days within the requested month
      query = `SELECT id, start_datetime, end_datetime, mode, room, status
               FROM advisor_slots
               WHERE advisor_user_id = ? AND DATE(start_datetime) BETWEEN ? AND ? AND DATE(start_datetime) >= CURDATE()
               ORDER BY start_datetime ASC`;
      params = [advisorId, monthStart, monthEnd];
    } else if (start && end) {
      // Arbitrary inclusive range
      // Exclude past days within the requested range
      query = `SELECT id, start_datetime, end_datetime, mode, room, status
               FROM advisor_slots
               WHERE advisor_user_id = ? AND DATE(start_datetime) BETWEEN ? AND ? AND DATE(start_datetime) >= CURDATE()
               ORDER BY start_datetime ASC`;
      params = [advisorId, start, end];
    } else {
      return res.status(400).json({ error: 'Missing required query param: date (YYYY-MM-DD) or month (YYYY-MM) or start/end (YYYY-MM-DD)' });
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Advisor slots fetch error', err);
    res.status(500).json({ error: 'Failed to load slots' });
  }
});

// POST /api/advisors/:id/slots
// Create advisor slots (bulk insert)
router.post('/:id/slots', async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    const advisorId = req.params.id;
    const { slots } = req.body || {};
    if (!Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ error: 'Request body must include non-empty array: slots' });
    }

    await conn.beginTransaction();
    const created = [];
    for (const s of slots) {
      const startIso = s.start_datetime || s.start;
      const endIso = s.end_datetime || s.end;
      if (!startIso || !endIso) {
        await conn.rollback();
        return res.status(400).json({ error: 'Each slot must include start/end datetime' });
      }
      const start = new Date(startIso);
      const end = new Date(endIso);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        await conn.rollback();
        return res.status(400).json({ error: 'Invalid datetime format in slot payload' });
      }
      // Guard: disallow creating slots for past days (date-only comparison)
      const today = new Date();
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (startDay < todayDay) {
        await conn.rollback();
        return res.status(400).json({ error: 'Cannot create slots for past days' });
      }
      const mode = normalizeMode(s.mode);
      const room = s.room || null;
      const [result] = await conn.query(
        'INSERT INTO advisor_slots (advisor_user_id, start_datetime, end_datetime, mode, room) VALUES (?,?,?,?,?)',
        [advisorId, start, end, mode, room]
      );
      created.push({ id: result.insertId, advisor_user_id: Number(advisorId), start_datetime: start, end_datetime: end, mode, room, status: 'available' });
    }
    await conn.commit();
    res.status(201).json(created);
  } catch (err) {
    await conn.rollback();
    console.error('Advisor slots create error', err);
    res.status(500).json({ error: 'Failed to create advisor slots' });
  } finally {
    conn.release();
  }
});

// DELETE /api/advisors/:id/slots/:slotId
router.delete('/:id/slots/:slotId', async (req, res) => {
  const pool = getPool();
  try {
    const advisorId = req.params.id;
    const slotId = req.params.slotId;
    const [result] = await pool.query('DELETE FROM advisor_slots WHERE id = ? AND advisor_user_id = ?', [slotId, advisorId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Slot not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Advisor slot delete error', err);
    res.status(500).json({ error: 'Failed to delete slot' });
  }
});

// DELETE /api/advisors/:id/slots?date=YYYY-MM-DD
router.delete('/:id/slots', async (req, res) => {
  const pool = getPool();
  try {
    const advisorId = req.params.id;
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Missing required query param: date (YYYY-MM-DD)' });
    const [result] = await pool.query('DELETE FROM advisor_slots WHERE advisor_user_id = ? AND DATE(start_datetime) = ?', [advisorId, date]);
    res.json({ success: true, deleted: result.affectedRows });
  } catch (err) {
    console.error('Advisor slots bulk delete error', err);
    res.status(500).json({ error: 'Failed to delete slots' });
  }
});

module.exports = router;

// Update consultation-related settings for an advisor
// PATCH /api/advisors/:id/consultation-settings
router.patch('/:id/consultation-settings', async (req, res) => {
  const pool = getPool();
  const advisorId = Number(req.params.id);
  const { bio, topics, guidelines, courses } = req.body || {};
  const tList = Array.isArray(topics) ? topics : [];
  const gList = Array.isArray(guidelines) ? guidelines : [];
  const cList = Array.isArray(courses) ? courses : [];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE advisor_profiles SET bio = ? WHERE user_id = ?`,
      [bio || null, advisorId]
    );

    await conn.query(`DELETE FROM advisor_topics WHERE advisor_user_id = ?`, [advisorId]);
    for (const topic of tList) {
      const v = String(topic || '').trim();
      if (v) await conn.query(`INSERT INTO advisor_topics (advisor_user_id, topic) VALUES (?, ?)`, [advisorId, v]);
    }

    await conn.query(`DELETE FROM advisor_guidelines WHERE advisor_user_id = ?`, [advisorId]);
    for (const gl of gList) {
      const v = String(gl || '').trim();
      if (v) await conn.query(`INSERT INTO advisor_guidelines (advisor_user_id, guideline_text) VALUES (?, ?)`, [advisorId, v]);
    }

    await conn.query(`DELETE FROM advisor_courses WHERE advisor_user_id = ?`, [advisorId]);
    for (const crs of cList) {
      if (crs && typeof crs === 'object') {
        const code = String(crs.code || '').trim() || null;
        const name = String(crs.name || '').trim() || null;
        const legacy = name || code; // keep something in course_name for compatibility
        if (name || code) {
          await conn.query(
            `INSERT INTO advisor_courses (advisor_user_id, course_name, subject_code, subject_name) VALUES (?,?,?,?)`,
            [advisorId, legacy, code, name]
          );
        }
      } else {
        const v = String(crs || '').trim();
        if (v) {
          await conn.query(
            `INSERT INTO advisor_courses (advisor_user_id, course_name, subject_code, subject_name) VALUES (?,?,?,?)`,
            [advisorId, v, null, v]
          );
        }
      }
    }

    await conn.commit();
    res.json({ success: true, updated: { topics: tList.length, guidelines: gList.length, courses: cList.length } });
  } catch (err) {
    await conn.rollback();
    console.error('Failed to update advisor consultation settings:', err);
    res.status(500).json({ error: 'Failed to update consultation settings' });
  } finally {
    conn.release();
  }
});