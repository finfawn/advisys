const express = require('express');
const { getPool } = require('../db/pool');

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
  const h = dt.getHours();
  const m = dt.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// GET /api/availability/today
// Returns advisors available today with per-day time range and mode
router.get('/today', async (req, res) => {
  const pool = getPool();
  try {
    const today = new Date();
    const dow = getDowKey(today);
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, ap.title, ap.department,
              av.start_time, av.end_time,
              m.online_enabled, m.in_person_enabled
       FROM users u
       JOIN advisor_profiles ap ON ap.user_id = u.id
       JOIN advisor_availability av ON av.advisor_user_id = u.id AND av.day_of_week = ?
       LEFT JOIN advisor_modes m ON m.advisor_user_id = u.id
       WHERE u.role = 'advisor' AND u.status = 'active'
       ORDER BY u.id ASC`, [dow]
    );

    // Aggregate by advisor (in case of multiple blocks per day)
    const byAdvisor = new Map();
    for (const r of rows) {
      const curr = byAdvisor.get(r.id) || {
        id: r.id,
        name: r.full_name,
        title: r.title,
        department: r.department,
        earliest: r.start_time,
        latest: r.end_time,
        online_enabled: r.online_enabled ? 1 : 0,
        in_person_enabled: r.in_person_enabled ? 1 : 0,
      };
      // Update earliest/latest
      curr.earliest = curr.earliest < r.start_time ? curr.earliest : r.start_time;
      curr.latest = curr.latest > r.end_time ? curr.latest : r.end_time;
      byAdvisor.set(r.id, curr);
    }

    const result = Array.from(byAdvisor.values()).map(a => {
      let modeStr = 'Online';
      if (a.online_enabled && a.in_person_enabled) modeStr = 'In-person/Online';
      else if (a.in_person_enabled) modeStr = 'In-person';
      else modeStr = 'Online';
      return {
        id: a.id,
        name: a.name,
        title: a.title,
        department: a.department,
        schedule: dow.charAt(0).toUpperCase() + dow.slice(1),
        time: fmtRange(a.earliest, a.latest),
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

    // Load all advisor slots for the month, only active advisors and available slots
    const [rows] = await pool.query(
      `SELECT s.advisor_user_id AS id, u.full_name, s.start_datetime, s.end_datetime, s.mode, s.status
       FROM advisor_slots s
       JOIN users u ON u.id = s.advisor_user_id
       WHERE u.role = 'advisor' AND u.status = 'active'
         AND s.status = 'available'
         AND DATE(s.start_datetime) BETWEEN ? AND ?
       ORDER BY s.advisor_user_id ASC, s.start_datetime ASC`,
      [monthStartKey, monthEndKey]
    );

    // Group by date and advisor; compute earliest/latest slot per day and combined mode
    const byDateAdvisor = new Map();
    for (const r of rows) {
      const start = new Date(r.start_datetime);
      const end = new Date(r.end_datetime);
      const dateKey = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
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