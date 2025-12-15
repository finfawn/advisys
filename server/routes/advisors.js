const express = require('express');
const { getPool } = require('../db/pool');
const moment = require('moment-timezone');

const router = express.Router();

function dayLabel(dow) {
  const map = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
  };
  return map[dow] || dow;
}

router.get('/', async (req, res) => {
  const pool = getPool();
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.status AS user_status, ap.title, ap.department, ap.status AS profile_status, ap.avatar_url, ap.office_location
       FROM users u
       LEFT JOIN advisor_profiles ap ON ap.user_id = u.id
       WHERE u.role = 'advisor'
         AND u.status = 'active'
         AND (ap.status IS NULL OR ap.status <> 'inactive')`
    );
    const result = [];
    for (const row of rows) {
      // Fetch actual available slots for the advisor
      const [availableSlots] = await pool.query(
        `SELECT start_datetime, end_datetime
         FROM advisor_slots
         WHERE advisor_user_id = ? AND end_datetime >= NOW()
         ORDER BY start_datetime ASC`,
        [row.id]
      );

      let displayTimeRange = null;
      if (availableSlots.length > 0) {
        const fmt12 = (val) => {
          let d = null;
          if (val instanceof Date) d = val;
          else {
            const s = String(val || '').trim();
            if (/([zZ]|[+\-]\d{2}:?\d{2})$/.test(s)) d = new Date(s);
            else {
              const cleaned = s.replace(' ', 'T');
              d = new Date(`${cleaned}Z`);
            }
          }
          if (!d || isNaN(d.getTime())) return '';
          return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
        };
        const earliestStart = fmt12(availableSlots[0].start_datetime);
        const latestEnd = fmt12(availableSlots[availableSlots.length - 1].end_datetime);
        displayTimeRange = `${earliestStart}–${latestEnd}`;
      }

      // Fetch consultation modes from advisor_slots, considering only future slots
      const [slotModes] = await pool.query(
        'SELECT DISTINCT mode FROM advisor_slots WHERE advisor_user_id = ? AND end_datetime >= UTC_TIMESTAMP()',
        [row.id]
      );
      let courses = [];
      try {
        const [cRows] = await pool.query('SELECT subject_code, subject_name, course_name FROM advisor_courses WHERE advisor_user_id = ? LIMIT 6', [row.id]);
        courses = cRows.map(c => ({ subject_code: c.subject_code, name: c.subject_name || c.course_name }));
      } catch (e) {
        // If courses table missing, continue without it
        courses = [];
      }
      const scheduleDays = null; // No longer using static schedule days
      const timeRange = displayTimeRange; // Use the dynamically calculated time range
      let modeStr = ''; // Default to empty if no modes found
      if (slotModes && slotModes.length > 0) {
        const modes = slotModes.map(sm => sm.mode);
        const hasOnline = modes.includes('online');
        const hasInPerson = modes.includes('face_to_face');

        if (hasOnline && hasInPerson) modeStr = 'In-person/Online';
        else if (hasInPerson) modeStr = 'In-person';
        else if (hasOnline) modeStr = 'Online';
      }
      result.push({
        id: row.id,
        name: row.full_name,
        email: row.email,
        userStatus: row.user_status,
        profileStatus: row.profile_status,
        title: row.title,
        department: row.department,
        status: 'Available',
        schedule: scheduleDays,
        time: timeRange,
        mode: modeStr,
        coursesTaught: courses,
        avatar: row.avatar_url || null,
        officeLocation: row.office_location || null,
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
      `SELECT u.id, u.full_name, ap.title, ap.department, ap.bio, ap.office_location, ap.avatar_url
       FROM users u LEFT JOIN advisor_profiles ap ON ap.user_id = u.id
       WHERE u.id = ? AND u.role='advisor'`, [advisorId]
    );
    if (!u) return res.status(404).json({ error: 'Advisor not found' });

    // Fetch optional sections defensively so missing tables/rows don't 500
    let topics = [];
    let guidelines = [];
    let courses = [];
    let modes = [];
    let avail = [];
    try {
      const [tRows] = await pool.query('SELECT topic FROM advisor_topics WHERE advisor_user_id=?', [advisorId]);
      topics = tRows;
    } catch (e) {
      console.warn('advisor_topics query failed; continuing with empty list', e.message);
    }
    try {
      const [gRows] = await pool.query('SELECT guideline_text FROM advisor_guidelines WHERE advisor_user_id=?', [advisorId]);
      guidelines = gRows;
    } catch (e) {
      console.warn('advisor_guidelines query failed; continuing with empty list', e.message);
    }
    try {
      const [cRows] = await pool.query('SELECT subject_code, subject_name, course_name FROM advisor_courses WHERE advisor_user_id=?', [advisorId]);
      courses = cRows;
    } catch (e) {
      console.warn('advisor_courses query failed; continuing with empty list', e.message);
    }
    try {
      const [mRows] = await pool.query('SELECT online_enabled, in_person_enabled FROM advisor_modes WHERE advisor_user_id=?', [advisorId]);
      modes = mRows;
    } catch (e) {
      console.warn('advisor_modes query failed; continuing with defaults', e.message);
    }
    try {
      const [aRows] = await pool.query('SELECT day_of_week, start_time, end_time FROM advisor_availability WHERE advisor_user_id=?', [advisorId]);
      avail = aRows;
    } catch (e) {
      console.warn('advisor_availability query failed; continuing with Unavailable', e.message);
    }

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
    // Fetch consultation modes from advisor_slots, considering only future slots
    const [slotModes] = await pool.query(
      'SELECT DISTINCT mode FROM advisor_slots WHERE advisor_user_id = ? AND end_datetime >= NOW()',
      [advisorId]
    );

    if (slotModes && slotModes.length > 0) {
      const modes = slotModes.map(sm => sm.mode);
      const hasOnline = modes.includes('online');
      const hasInPerson = modes.includes('face_to_face');

      if (hasOnline && hasInPerson) consultationMode.push('In-person/Online');
      else if (hasInPerson) consultationMode.push('In-person');
      else if (hasOnline) consultationMode.push('Online');
    }

    res.json({
      id: u.id,
      name: u.full_name,
      title: u.title,
      department: u.department,
      bio: u.bio,
      officeLocation: u.office_location || null,
      avatar: u.avatar_url || null,
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

    // Cleanup: delete any slots whose end time has passed (UTC) for this advisor
    // This ensures past-time slots disappear immediately, even on the current day.
    try {
      await pool.query(
        `DELETE FROM advisor_slots
         WHERE advisor_user_id = ?
           AND end_datetime <= UTC_TIMESTAMP()`,
        [advisorId]
      );
    } catch (cleanupErr) {
      console.error('Advisor slots cleanup error', cleanupErr);
    }

    // Helper to pad numbers
    const pad = (n) => String(n).padStart(2, '0');

    let query = '';
    let params = [];

    if (date) {
      // Single Manila day mapped to UTC boundaries
      const startPH = moment.tz(date, 'YYYY-MM-DD', 'Asia/Manila').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
      const nextPH = moment.tz(date, 'YYYY-MM-DD', 'Asia/Manila').add(1, 'day').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
      query = `SELECT id, start_datetime, end_datetime, mode, room, status
               FROM advisor_slots
               WHERE advisor_user_id = ? AND start_datetime >= ? AND start_datetime < ?
               ORDER BY start_datetime ASC`;
      params = [advisorId, startPH, nextPH];
    } else if (month) {
      // Manila month range (inclusive)
      const [yStr, mStr] = month.split('-');
      const year = Number(yStr);
      const monthIdx = Number(mStr) - 1; // 0-based
      if (Number.isNaN(year) || Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) {
        return res.status(400).json({ error: 'Invalid month format. Expected YYYY-MM' });
      }
      const lastDay = new Date(year, monthIdx + 1, 0).getDate();
      const monthStartPH = moment.tz({ year, month: monthIdx, day: 1 }, 'Asia/Manila').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
      const monthEndPH = moment.tz({ year, month: monthIdx, day: lastDay }, 'Asia/Manila').add(1, 'day').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
      query = `SELECT id, start_datetime, end_datetime, mode, room, status
               FROM advisor_slots
               WHERE advisor_user_id = ? AND start_datetime >= ? AND start_datetime < ?
               ORDER BY start_datetime ASC`;
      params = [advisorId, monthStartPH, monthEndPH];
    } else if (start && end) {
      // Arbitrary Manila range
      const startPH = moment.tz(start, 'YYYY-MM-DD', 'Asia/Manila').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
      const endPHNext = moment.tz(end, 'YYYY-MM-DD', 'Asia/Manila').add(1, 'day').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
      query = `SELECT id, start_datetime, end_datetime, mode, room, status
               FROM advisor_slots
               WHERE advisor_user_id = ? AND start_datetime >= ? AND start_datetime < ?
               ORDER BY start_datetime ASC`;
      params = [advisorId, startPH, endPHNext];
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
    // Helper: parse incoming datetime; if no timezone provided, treat as Manila local
    const parseManilaLocal = (val) => {
      if (!val) return null;
      if (val instanceof Date) return val;
      if (typeof val === 'string') {
        const s = val.trim();
        if (/([zZ]|[+\-]\d{2}:?\d{2})$/.test(s)) {
          const d = new Date(s);
          return isNaN(d.getTime()) ? null : d;
        }
        const m = s.replace('T', ' ').match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/);
        if (m) {
          const [_, y, mo, d2, hh, mm, ss] = m;
          return new Date(`${y}-${mo}-${d2}T${hh}:${mm}:${ss || '00'}+08:00`);
        }
        // ISO without timezone: treat as Manila local explicitly
        const isoNoTz = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)$/);
        const d = isoNoTz ? new Date(`${s}+08:00`) : new Date(s);
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };
    const formatUTCMySQL = (d) => {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const hour = String(d.getUTCHours()).padStart(2, '0');
      const minute = String(d.getUTCMinutes()).padStart(2, '0');
      const second = String(d.getUTCSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    };

    for (const s of slots) {
      const startIso = s.start_datetime || s.start;
      const endIso = s.end_datetime || s.end;
      if (!startIso || !endIso) {
        await conn.rollback();
        return res.status(400).json({ error: 'Each slot must include start/end datetime' });
      }
      const start = parseManilaLocal(startIso);
      const end = parseManilaLocal(endIso);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        await conn.rollback();
        return res.status(400).json({ error: 'Invalid datetime format in slot payload' });
      }
      if (end.getTime() <= start.getTime()) {
        await conn.rollback();
        return res.status(400).json({ error: 'End time must be after start time' });
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
      const startStr = formatUTCMySQL(start);
      const endStr = formatUTCMySQL(end);
      const [result] = await conn.query(
        'INSERT INTO advisor_slots (advisor_user_id, start_datetime, end_datetime, mode, room) VALUES (?,?,?,?,?)',
        [advisorId, startStr, endStr, mode, room]
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

// PATCH /api/advisors/:id/slots/:slotId
// Update a single advisor slot's datetime/mode/room
router.patch('/:id/slots/:slotId', async (req, res) => {
  const pool = getPool();
  const advisorId = Number(req.params.id);
  const slotId = Number(req.params.slotId);
  try {
    // Fetch existing slot
    const [[existing]] = await pool.query(
      `SELECT id, advisor_user_id, start_datetime, end_datetime, mode, room
       FROM advisor_slots WHERE id = ? AND advisor_user_id = ?`,
      [slotId, advisorId]
    );
    if (!existing) return res.status(404).json({ error: 'Slot not found' });

    const { start_datetime, end_datetime, mode, room } = req.body || {};
    // Helper: parse incoming datetime; treat no-tz as Manila local
    const parseManilaLocal = (val) => {
      if (!val) return null;
      if (val instanceof Date) return val;
      if (typeof val === 'string') {
        const s = val.trim();
        if (/([zZ]|[+\-]\d{2}:?\d{2})$/.test(s)) {
          const d = new Date(s);
          return isNaN(d.getTime()) ? null : d;
        }
        const m = s.replace('T', ' ').match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/);
        if (m) {
          const [_, y, mo, d2, hh, mm, ss] = m;
          return new Date(`${y}-${mo}-${d2}T${hh}:${mm}:${ss || '00'}+08:00`);
        }
        const isoNoTz = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)$/);
        const d = isoNoTz ? new Date(`${s}+08:00`) : new Date(s);
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const newStart = start_datetime ? parseManilaLocal(start_datetime) : new Date(existing.start_datetime);
    const newEnd = end_datetime ? parseManilaLocal(end_datetime) : new Date(existing.end_datetime);
    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
      return res.status(400).json({ error: 'Invalid datetime format in payload' });
    }
    if (newEnd.getTime() <= newStart.getTime()) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }
    // Guard: disallow updating slot to a past day
    const today = new Date();
    const startDay = new Date(newStart.getFullYear(), newStart.getMonth(), newStart.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (startDay < todayDay) {
      return res.status(400).json({ error: 'Cannot move slots to past days' });
    }

    const newMode = mode ? normalizeMode(mode) : existing.mode;
    const newRoom = typeof room !== 'undefined' ? (room || null) : existing.room;

    const yS = newStart.getUTCFullYear();
    const mS = String(newStart.getUTCMonth() + 1).padStart(2, '0');
    const dS = String(newStart.getUTCDate()).padStart(2, '0');
    const hS = String(newStart.getUTCHours()).padStart(2, '0');
    const minS = String(newStart.getUTCMinutes()).padStart(2, '0');
    const secS = String(newStart.getUTCSeconds()).padStart(2, '0');
    const yE = newEnd.getUTCFullYear();
    const mE = String(newEnd.getUTCMonth() + 1).padStart(2, '0');
    const dE = String(newEnd.getUTCDate()).padStart(2, '0');
    const hE = String(newEnd.getUTCHours()).padStart(2, '0');
    const minE = String(newEnd.getUTCMinutes()).padStart(2, '0');
    const secE = String(newEnd.getUTCSeconds()).padStart(2, '0');
    const startStr = `${yS}-${mS}-${dS} ${hS}:${minS}:${secS}`;
    const endStr = `${yE}-${mE}-${dE} ${hE}:${minE}:${secE}`;
    const [result] = await pool.query(
      `UPDATE advisor_slots SET start_datetime = ?, end_datetime = ?, mode = ?, room = ?
       WHERE id = ? AND advisor_user_id = ?`,
      [startStr, endStr, newMode, newRoom, slotId, advisorId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Slot not found' });

    res.json({
      id: slotId,
      advisor_user_id: advisorId,
      start_datetime: newStart,
      end_datetime: newEnd,
      mode: newMode,
      room: newRoom,
      status: 'available',
    });
  } catch (err) {
    console.error('Advisor slot update error', err);
    res.status(500).json({ error: 'Failed to update slot' });
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
    const start = moment.tz(date, 'YYYY-MM-DD', 'Asia/Manila').startOf('day').format('YYYY-MM-DD HH:mm:ss');
    const next = moment.tz(date, 'YYYY-MM-DD', 'Asia/Manila').add(1, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss');
    // Delete any slot that overlaps the Manila day: (start < next) AND (end > start)
    const [result] = await pool.query(
      'DELETE FROM advisor_slots WHERE advisor_user_id = ? AND start_datetime < ? AND end_datetime > ?',
      [advisorId, next, start]
    );
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

    // Update bio if advisor_profiles table exists
    try {
      await conn.query(
        `UPDATE advisor_profiles SET bio = ? WHERE user_id = ?`,
        [bio || null, advisorId]
      );
    } catch (e) {
      if (e && (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146)) {
        console.warn('advisor_profiles missing; skipping bio update');
      } else {
        throw e;
      }
    }

    // Replace topics list (defensive against missing table)
    try {
      await conn.query(`DELETE FROM advisor_topics WHERE advisor_user_id = ?`, [advisorId]);
      for (const topic of tList) {
        const v = String(topic || '').trim();
        if (v) await conn.query(`INSERT INTO advisor_topics (advisor_user_id, topic) VALUES (?, ?)`, [advisorId, v]);
      }
    } catch (e) {
      if (e && (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146)) {
        console.warn('advisor_topics missing; skipping topics update');
      } else {
        throw e;
      }
    }

    // Replace guidelines list
    try {
      await conn.query(`DELETE FROM advisor_guidelines WHERE advisor_user_id = ?`, [advisorId]);
      for (const gl of gList) {
        const v = String(gl || '').trim();
        if (v) await conn.query(`INSERT INTO advisor_guidelines (advisor_user_id, guideline_text) VALUES (?, ?)`, [advisorId, v]);
      }
    } catch (e) {
      if (e && (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146)) {
        console.warn('advisor_guidelines missing; skipping guidelines update');
      } else {
        throw e;
      }
    }

    // Replace courses list; accept multiple input shapes
    try {
      // Detect if subject_code/subject_name columns exist; fall back if not
      let hasSubjectColumns = true;
      try {
        await conn.query(`SELECT subject_code, subject_name FROM advisor_courses LIMIT 1`);
      } catch (colErr) {
        if (colErr && (colErr.code === 'ER_BAD_FIELD_ERROR' || /Unknown column/i.test(colErr.message))) {
          hasSubjectColumns = false;
        } else if (colErr && (colErr.code === 'ER_NO_SUCH_TABLE' || colErr.errno === 1146)) {
          console.warn('advisor_courses missing; skipping courses update');
          hasSubjectColumns = false;
        } else {
          throw colErr;
        }
      }

      await conn.query(`DELETE FROM advisor_courses WHERE advisor_user_id = ?`, [advisorId]);
      for (const crs of cList) {
        if (crs && typeof crs === 'object') {
          const code = String(crs.code || crs.subject_code || '').trim() || null;
          const name = String(crs.name || crs.subject_name || crs.course_name || '').trim() || null;
          const legacy = name || code; // keep something in course_name for compatibility
          if (name || code) {
            if (hasSubjectColumns) {
              await conn.query(
                `INSERT INTO advisor_courses (advisor_user_id, course_name, subject_code, subject_name) VALUES (?,?,?,?)`,
                [advisorId, legacy, code, name]
              );
            } else {
              await conn.query(
                `INSERT INTO advisor_courses (advisor_user_id, course_name) VALUES (?,?)`,
                [advisorId, legacy]
              );
            }
          }
        } else {
          const v = String(crs || '').trim();
          if (v) {
            if (hasSubjectColumns) {
              await conn.query(
                `INSERT INTO advisor_courses (advisor_user_id, course_name, subject_code, subject_name) VALUES (?,?,?,?)`,
                [advisorId, v, null, v]
              );
            } else {
              await conn.query(
                `INSERT INTO advisor_courses (advisor_user_id, course_name) VALUES (?,?)`,
                [advisorId, v]
              );
            }
          }
        }
      }
    } catch (e) {
      if (e && (e.code === 'ER_NO_SUCH_TABLE' || e.errno === 1146)) {
        console.warn('advisor_courses missing; skipping courses update');
      } else if (e && (e.code === 'ER_BAD_FIELD_ERROR' || /Unknown column/i.test(e.message))) {
        console.warn('advisor_courses subject columns not found; saved course_name only');
      } else {
        throw e;
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
