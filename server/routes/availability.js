const express = require('express');
const { getPool } = require('../db/pool');
const moment = require('moment-timezone');

const router = express.Router();

function getDowKey(date) {
  const keys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  return keys[date.getDay()];
}

function fmtTime(hhmmss) {
  const [hStr, mStr] = hhmmss.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtRange(start, end) {
  return `${fmtTime(start)} – ${fmtTime(end)}`;
}

// Format a Date object into 12-hour time string
function formatTimeStr(val) {
  let d = null;
  if (val instanceof Date) {
    d = val;
  } else {
    const s = String(val || '').trim();
    if (!s) return '';
    if (/([zZ]|[+\-]\d{2}:?\d{2})$/.test(s)) {
      const dd = new Date(s);
      if (!isNaN(dd.getTime())) d = dd;
    } else {
      const cleaned = s.replace(' ', 'T');
      const dd = new Date(`${cleaned}Z`);
      if (!isNaN(dd.getTime())) d = dd;
    }
  }
  if (!d || isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

// GET /api/availability/today
// Returns advisors who have at least one AVAILABLE slot today (PH timezone)
router.get('/today', async (req, res) => {
  const pool = getPool();
  try {
    // Determine PH dow label for UI
    const dow = getDowKey(new Date());

    const startPHUtc = moment.tz(moment().format('YYYY-MM-DD'), 'Asia/Manila').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
    const nextPHUtc = moment.tz(moment().format('YYYY-MM-DD'), 'Asia/Manila').add(1, 'day').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
    const [rows] = await pool.query(
      `SELECT s.advisor_user_id AS id, u.full_name, ap.title, ap.department, ap.avatar_url,
              s.start_datetime, s.end_datetime, s.mode
       FROM advisor_slots s
       JOIN users u ON u.id = s.advisor_user_id
       JOIN advisor_profiles ap ON ap.user_id = u.id
       WHERE u.role = 'advisor' AND u.status = 'active'
         AND s.status = 'available'
         AND s.start_datetime >= ? AND s.start_datetime < ?
       ORDER BY s.advisor_user_id ASC, s.start_datetime ASC`,
      [startPHUtc, nextPHUtc]
    );

    // Aggregate earliest/latest slot per advisor and combined mode flags
    const byAdvisor = new Map();
    for (const r of rows) {
      const startKey = r.start_datetime;
      const endKey = r.end_datetime;
      const curr = byAdvisor.get(r.id) || {
        id: r.id,
        name: r.full_name,
        title: r.title,
        department: r.department,
        avatar: r.avatar_url || null,
        earliest: startKey,
        latest: endKey,
        hasOnline: false,
        hasInPerson: false,
      };
      if (String(startKey).localeCompare(String(curr.earliest)) < 0) curr.earliest = startKey;
      if (String(endKey).localeCompare(String(curr.latest)) > 0) curr.latest = endKey;
      const modeVal = (r.mode || '').toLowerCase();
      if (modeVal === 'face_to_face' || modeVal === 'in_person') curr.hasInPerson = true;
      else if (modeVal === 'hybrid') { curr.hasOnline = true; curr.hasInPerson = true; }
      else curr.hasOnline = true;
      byAdvisor.set(r.id, curr);
    }

    // Sort by earliest start and cap to 4 advisors
    const capped = Array.from(byAdvisor.values())
      .sort((a, b) => String(a.earliest).localeCompare(String(b.earliest)))
      .slice(0, 4);

    // Fetch courses taught for these advisors
    let coursesByAdvisor = new Map();
    try {
      const ids = capped.map(a => a.id);
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        const [cRows] = await pool.query(
          `SELECT advisor_user_id, subject_code, subject_name, course_name
           FROM advisor_courses
           WHERE advisor_user_id IN (${placeholders})`, ids
        );
        for (const r of cRows) {
          const list = coursesByAdvisor.get(r.advisor_user_id) || [];
          list.push({ subject_code: r.subject_code, name: r.subject_name || r.course_name });
          coursesByAdvisor.set(r.advisor_user_id, list);
        }
      }
    } catch (e) {
      coursesByAdvisor = new Map();
    }

    const result = capped.map(a => {
      const modeStr = a.hasOnline && a.hasInPerson
        ? 'In-person/Online'
        : (a.hasInPerson ? 'In-person' : 'Online');
      return {
        id: a.id,
        name: a.name,
        title: a.title,
        department: a.department,
        avatar: a.avatar,
        coursesTaught: coursesByAdvisor.get(a.id) || [],
        schedule: dow.charAt(0).toUpperCase() + dow.slice(1),
        time: `${formatTimeStr(a.earliest)} – ${formatTimeStr(a.latest)}`,
        mode: modeStr,
      };
    });

    return res.json(result);
  } catch (err) {
    console.error('Availability today error', err);
    return res.status(500).json({ error: 'Failed to load today availability' });
  }
});

// GET /api/availability/calendar?month=YYYY-MM
// Returns mapping { 'YYYY-MM-DD': [ { id, name, slots, mode } ] }
router.get('/calendar', async (req, res) => {
  const pool = getPool();
  try {
    const monthParam = req.query.month; // YYYY-MM
    const now = new Date();
    const year = monthParam ? Number(monthParam.split('-')[0]) : now.getFullYear();
    const monthIdx = monthParam ? Number(monthParam.split('-')[1]) - 1 : now.getMonth();

    const pad = (n) => String(n).padStart(2, '0');
    const lastDay = new Date(year, monthIdx + 1, 0).getDate();
    const monthStartKey = `${year}-${pad(monthIdx + 1)}-01`;
    const monthEndKey = `${year}-${pad(monthIdx + 1)}-${pad(lastDay)}`;

    // Cleanup: delete any slots whose end time has passed globally before building calendar
    try {
      await pool.query(
        `DELETE FROM advisor_slots
         WHERE end_datetime <= UTC_TIMESTAMP()`
      );
    } catch (cleanupErr) {
      console.error('Availability calendar cleanup error', cleanupErr);
      // Non-fatal: continue building calendar
    }


// Load advisor slots for the month, only active advisors and available slots, excluding past days
    const monthStartPHUtc = moment.tz({ year, month: monthIdx, day: 1 }, 'Asia/Manila').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
    const monthEndNextPHUtc = moment.tz({ year, month: monthIdx, day: lastDay }, 'Asia/Manila').add(1, 'day').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
    const [rows] = await pool.query(
      `SELECT s.advisor_user_id AS id, u.full_name, s.start_datetime, s.end_datetime, s.mode, s.status
       FROM advisor_slots s
       JOIN users u ON u.id = s.advisor_user_id
       WHERE u.role = 'advisor' AND u.status = 'active'
         AND s.status = 'available'
         AND s.start_datetime >= ? AND s.start_datetime < ?
       ORDER BY s.advisor_user_id ASC, s.start_datetime ASC`,
      [monthStartPHUtc, monthEndNextPHUtc]
    );

    // Group by date and advisor; compute earliest/latest slot per day and combined mode
    const byDateAdvisor = new Map();
    for (const r of rows) {
      // Derive date key in Asia/Manila based on stored UTC datetime
      const dateKey = moment.tz(r.start_datetime, 'UTC').tz('Asia/Manila').format('YYYY-MM-DD');
      const mapKey = `${dateKey}:${r.id}`;
      const curr = byDateAdvisor.get(mapKey) || {
        dateKey,
        id: r.id,
        name: r.full_name,
        earliest: r.start_datetime,
        latest: r.end_datetime,
        hasOnline: false,
        hasInPerson: false,
      };
      // Update earliest/latest using naive string compare
      if (String(r.start_datetime).localeCompare(String(curr.earliest)) < 0) curr.earliest = r.start_datetime;
      if (String(r.end_datetime).localeCompare(String(curr.latest)) > 0) curr.latest = r.end_datetime;
      // Normalize mode flags
      const modeVal = (r.mode || '').toLowerCase();
      if (modeVal === 'face_to_face' || modeVal === 'in_person') curr.hasInPerson = true;
      else if (modeVal === 'hybrid') { curr.hasOnline = true; curr.hasInPerson = true; }
      else curr.hasOnline = true; // default treat as online
      byDateAdvisor.set(mapKey, curr);
    }

    // Build date map for response
    const result = {};
    for (const entry of byDateAdvisor.values()) {
      const mode = entry.hasOnline ? 'Online' : 'In-person';
      const slotsLabel = `${formatTimeStr(entry.earliest)} – ${formatTimeStr(entry.latest)}`;
      if (!result[entry.dateKey]) result[entry.dateKey] = [];
      result[entry.dateKey].push({
        id: entry.id,
        name: entry.name,
        slots: slotsLabel,
        mode,
      });
    }

    return res.json(result);
  } catch (err) {
    console.error('Availability calendar error', err);
    return res.status(500).json({ error: 'Failed to load calendar availability' });
  }
});

module.exports = router;
