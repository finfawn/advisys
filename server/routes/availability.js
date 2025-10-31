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
// Returns mapping { 'YYYY-MM-DD': [ { name, slots, mode } ] }
router.get('/calendar', async (req, res) => {
  const pool = getPool();
  try {
    const monthParam = req.query.month; // YYYY-MM
    const now = new Date();
    const year = monthParam ? Number(monthParam.split('-')[0]) : now.getFullYear();
    const monthIdx = monthParam ? Number(monthParam.split('-')[1]) - 1 : now.getMonth();

    const monthStart = new Date(year, monthIdx, 1);
    const monthEnd = new Date(year, monthIdx + 1, 0);

    // Load all advisors with availability and modes
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, ap.title,
              av.day_of_week, av.start_time, av.end_time,
              m.online_enabled, m.in_person_enabled
       FROM users u
       JOIN advisor_profiles ap ON ap.user_id = u.id
       JOIN advisor_availability av ON av.advisor_user_id = u.id
       LEFT JOIN advisor_modes m ON m.advisor_user_id = u.id
       WHERE u.role = 'advisor' AND u.status = 'active'
       ORDER BY u.id ASC`
    );

    // Group availabilities by advisor and day_of_week
    const byAdvisorDow = new Map(); // key: `${advisorId}:${dow}` -> { name, start, end, modes }
    for (const r of rows) {
      const key = `${r.id}:${r.day_of_week}`;
      const curr = byAdvisorDow.get(key) || {
        id: r.id,
        name: r.full_name,
        day_of_week: r.day_of_week,
        earliest: r.start_time,
        latest: r.end_time,
        online_enabled: r.online_enabled ? 1 : 0,
        in_person_enabled: r.in_person_enabled ? 1 : 0,
      };
      curr.earliest = curr.earliest < r.start_time ? curr.earliest : r.start_time;
      curr.latest = curr.latest > r.end_time ? curr.latest : r.end_time;
      byAdvisorDow.set(key, curr);
    }

    // Build date map
    const pad = (n) => String(n).padStart(2, '0');
    const dowKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const result = {};
    for (let day = 1; day <= monthEnd.getDate(); day++) {
      const d = new Date(year, monthIdx, day);
      const dow = dowKeys[d.getDay()];
      const dateKey = `${year}-${pad(monthIdx + 1)}-${pad(day)}`;
      const items = [];
      for (const entry of byAdvisorDow.values()) {
        if (entry.day_of_week !== dow) continue;
        const mode = entry.online_enabled && entry.in_person_enabled
          ? 'Online' // prioritize Online for display; calendar marks presence
          : entry.in_person_enabled ? 'In-person' : 'Online';
        items.push({
          name: entry.name,
          slots: fmtRange(entry.earliest, entry.latest),
          mode,
        });
      }
      if (items.length) result[dateKey] = items;
    }

    return res.json(result);
  } catch (err) {
    console.error('Availability calendar error', err);
    return res.status(500).json({ error: 'Failed to load calendar availability' });
  }
});

module.exports = router;