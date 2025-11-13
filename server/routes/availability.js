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
function formatTimeFromDate(dt) {
  if (!(dt instanceof Date)) return '';
  const fmt = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return fmt.format(dt);
}

// GET /api/availability/today
// Returns advisors who have at least one AVAILABLE slot today (PH timezone)
router.get('/today', async (req, res) => {
  const pool = getPool();
  try {
    // Determine PH dow label for UI
    const nowPH = moment.tz(Date.now(), 'Asia/Manila').toDate();
    const dow = getDowKey(nowPH);

    const [rows] = await pool.query(
      `SELECT s.advisor_user_id AS id, u.full_name, ap.title, ap.department,
              s.start_datetime, s.end_datetime, s.mode
       FROM advisor_slots s
       JOIN users u ON u.id = s.advisor_user_id
       JOIN advisor_profiles ap ON ap.user_id = u.id
       WHERE u.role = 'advisor' AND u.status = 'active'
         AND s.status = 'available'
         AND DATE(s.start_datetime) = CURDATE()
       ORDER BY s.advisor_user_id ASC, s.start_datetime ASC`
    );

    // Aggregate earliest/latest slot per advisor and combined mode flags
    const byAdvisor = new Map();
    for (const r of rows) {
      const start = moment.tz(r.start_datetime, 'YYYY-MM-DD HH:mm:ss', 'Asia/Manila').toDate();
      const end = moment.tz(r.end_datetime, 'YYYY-MM-DD HH:mm:ss', 'Asia/Manila').toDate();
      const curr = byAdvisor.get(r.id) || {
        id: r.id,
        name: r.full_name,
        title: r.title,
        department: r.department,
        earliest: start,
        latest: end,
        hasOnline: false,
        hasInPerson: false,
      };
      if (start < curr.earliest) curr.earliest = start;
      if (end > curr.latest) curr.latest = end;
      const modeVal = (r.mode || '').toLowerCase();
      if (modeVal === 'face_to_face' || modeVal === 'in_person') curr.hasInPerson = true;
      else if (modeVal === 'hybrid') { curr.hasOnline = true; curr.hasInPerson = true; }
      else curr.hasOnline = true;
      byAdvisor.set(r.id, curr);
    }

    // Sort by earliest start and cap to 4 advisors
    const capped = Array.from(byAdvisor.values())
      .sort((a, b) => (a.earliest?.getTime?.() || 0) - (b.earliest?.getTime?.() || 0))
      .slice(0, 4);

    const result = capped.map(a => {
      const modeStr = a.hasOnline && a.hasInPerson
        ? 'In-person/Online'
        : (a.hasInPerson ? 'In-person' : 'Online');
      return {
        id: a.id,
        name: a.name,
        title: a.title,
        department: a.department,
        schedule: dow.charAt(0).toUpperCase() + dow.slice(1),
        time: `${formatTimeFromDate(a.earliest)} – ${formatTimeFromDate(a.latest)}`,
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
         WHERE end_datetime <= NOW()`
      );
    } catch (cleanupErr) {
      console.error('Availability calendar cleanup error', cleanupErr);
      // Non-fatal: continue building calendar
    }

const moment = require('moment-timezone');

// Load advisor slots for the month, only active advisors and available slots, excluding past days
    const [rows] = await pool.query(
      `SELECT s.advisor_user_id AS id, u.full_name, s.start_datetime, s.end_datetime, s.mode, s.status
       FROM advisor_slots s
       JOIN users u ON u.id = s.advisor_user_id
       WHERE u.role = 'advisor' AND u.status = 'active'
         AND s.status = 'available'
         AND DATE(s.start_datetime) BETWEEN ? AND ?
         AND DATE(s.start_datetime) >= CURDATE()
       ORDER BY s.advisor_user_id ASC, s.start_datetime ASC`,
      [monthStartKey, monthEndKey]
    );

    // Group by date and advisor; compute earliest/latest slot per day and combined mode
    const byDateAdvisor = new Map();
    for (const r of rows) {
      // Interpret the naive DATETIME from the database as Asia/Manila time
      const start = moment.tz(r.start_datetime, 'YYYY-MM-DD HH:mm:ss', 'Asia/Manila').toDate();
      const end = moment.tz(r.end_datetime, 'YYYY-MM-DD HH:mm:ss', 'Asia/Manila').toDate();
      // Build date key using Asia/Manila to keep grouping consistent with PH timezone
      const parts = new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(start);
      const y = parts.find((p) => p.type === 'year')?.value || String(start.getFullYear());
      const m = parts.find((p) => p.type === 'month')?.value || String(start.getMonth() + 1).padStart(2, '0');
      const d = parts.find((p) => p.type === 'day')?.value || String(start.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;
      const mapKey = `${dateKey}:${r.id}`;
      const curr = byDateAdvisor.get(mapKey) || {
        dateKey,
        id: r.id,
        name: r.full_name,
        earliest: start,
        latest: end,
        hasOnline: false,
        hasInPerson: false,
      };
      // Update earliest/latest
      if (start < curr.earliest) curr.earliest = start;
      if (end > curr.latest) curr.latest = end;
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
      const slotsLabel = `${formatTimeFromDate(entry.earliest)} – ${formatTimeFromDate(entry.latest)}`;
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