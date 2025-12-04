const express = require('express');
const { getPool } = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Utility helpers
function pad(n) { return String(n).padStart(2, '0'); }
function toYearMonthDay(date) {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}-${m}-${d}`;
}

function normalizeYearLevel(raw) {
  const n = Number(raw);
  if (!n || n < 1) return 1;
  if (n > 4) return 4;
  return n;
}

// GET /api/dashboard/advisors/:advisorId/summary
// Returns aggregated metrics used by advisor dashboard cards
router.get('/advisors/:advisorId/summary', async (req, res) => {
  const pool = getPool();
  const advisorId = req.params.advisorId;
  try {
    // Total completed consultations
    const [[totalRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM consultations WHERE advisor_user_id = ? AND status = 'completed'`,
      [advisorId]
    );
    const totalCompleted = Number(totalRow?.total || 0);

    // Year distribution (student year levels among completed consultations)
    const [yearRows] = await pool.query(
      `SELECT COALESCE(sp.year_level, '1') AS year_level, COUNT(*) AS count
       FROM consultations c
       LEFT JOIN student_profiles sp ON sp.user_id = c.student_user_id
       WHERE c.advisor_user_id = ? AND c.status = 'completed'
       GROUP BY sp.year_level`,
      [advisorId]
    );
    const yearDistribution = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const r of yearRows) {
      const y = normalizeYearLevel(r.year_level);
      yearDistribution[y] = Number(r.count || 0);
    }

    // Mode breakdown (online vs in-person for completed)
    const [modeRows] = await pool.query(
      `SELECT mode, COUNT(*) AS count
       FROM consultations
       WHERE advisor_user_id = ? AND status = 'completed'
       GROUP BY mode`,
      [advisorId]
    );
    let onlineCount = 0, inPersonCount = 0;
    for (const r of modeRows) {
      if (r.mode === 'online') onlineCount = Number(r.count || 0);
      else if (r.mode === 'in-person') inPersonCount = Number(r.count || 0);
    }

    // Average session length
    const [[avgRow]] = await pool.query(
      `SELECT AVG(CASE WHEN duration_minutes IS NOT NULL THEN duration_minutes
                       ELSE TIMESTAMPDIFF(MINUTE, start_datetime, end_datetime) END) AS avg_minutes
       FROM consultations
       WHERE advisor_user_id = ? AND status = 'completed'`,
      [advisorId]
    );
    const averageSessionMinutes = Math.round(Number(avgRow?.avg_minutes || 0));

    // Trend: monthly (current & previous) - counts per day
    const [[monthNow]] = await pool.query(`SELECT YEAR(CURDATE()) AS y, MONTH(CURDATE()) AS m`);
    const [[monthPrev]] = await pool.query(`SELECT YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AS y, MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AS m`);

    const [monthCurrRows] = await pool.query(
      `SELECT DAY(COALESCE(end_datetime, start_datetime)) AS d, COUNT(*) AS count
       FROM consultations
       WHERE advisor_user_id = ? AND status = 'completed'
         AND YEAR(COALESCE(end_datetime, start_datetime)) = ? AND MONTH(COALESCE(end_datetime, start_datetime)) = ?
       GROUP BY DAY(COALESCE(end_datetime, start_datetime))
       ORDER BY d ASC`,
      [advisorId, monthNow.y, monthNow.m]
    );
    const [monthPrevRows] = await pool.query(
      `SELECT DAY(COALESCE(end_datetime, start_datetime)) AS d, COUNT(*) AS count
       FROM consultations
       WHERE advisor_user_id = ? AND status = 'completed'
         AND YEAR(COALESCE(end_datetime, start_datetime)) = ? AND MONTH(COALESCE(end_datetime, start_datetime)) = ?
       GROUP BY DAY(COALESCE(end_datetime, start_datetime))
       ORDER BY d ASC`,
      [advisorId, monthPrev.y, monthPrev.m]
    );
    const monthCurrentRaw = monthCurrRows.map(r => ({ day: Number(r.d), count: Number(r.count || 0) }));
    const monthPreviousRaw = monthPrevRows.map(r => ({ day: Number(r.d), count: Number(r.count || 0) }));
    const lastDayCurr = new Date(monthNow.y, monthNow.m, 0).getDate();
    const lastDayPrev = new Date(monthPrev.y, monthPrev.m, 0).getDate();
    const fillMonth = (lastDay, rows) => {
      const map = new Map(rows.map(r => [Number(r.day), Number(r.count || 0)]));
      return Array.from({ length: lastDay }, (_, i) => ({ day: i + 1, count: map.get(i + 1) || 0 }));
    };
    const monthCurrent = fillMonth(lastDayCurr, monthCurrentRaw);
    const monthPrevious = fillMonth(lastDayPrev, monthPreviousRaw);

    // Trend: weekly (current & previous) - counts per day-of-week (Mon..Sun)
    const [weekCurrRows] = await pool.query(
      `SELECT DAYOFWEEK(COALESCE(end_datetime, start_datetime)) AS dow, COUNT(*) AS count
       FROM consultations
       WHERE advisor_user_id = ? AND status = 'completed'
         AND YEARWEEK(COALESCE(end_datetime, start_datetime), 1) = YEARWEEK(CURDATE(), 1)
       GROUP BY DAYOFWEEK(COALESCE(end_datetime, start_datetime))
       ORDER BY dow ASC`,
      [advisorId]
    );
    const [weekPrevRows] = await pool.query(
      `SELECT DAYOFWEEK(COALESCE(end_datetime, start_datetime)) AS dow, COUNT(*) AS count
       FROM consultations
       WHERE advisor_user_id = ? AND status = 'completed'
         AND YEARWEEK(COALESCE(end_datetime, start_datetime), 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1)
       GROUP BY DAYOFWEEK(COALESCE(end_datetime, start_datetime))
       ORDER BY dow ASC`,
      [advisorId]
    );
    const dowMap = { 1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat' };
    const weekCurrentRaw = weekCurrRows.map(r => ({ day: dowMap[r.dow] || String(r.dow), count: Number(r.count || 0) }));
    const weekPreviousRaw = weekPrevRows.map(r => ({ day: dowMap[r.dow] || String(r.dow), count: Number(r.count || 0) }));
    const orderedDOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const fillWeek = (rows) => {
      const map = new Map(rows.map(r => [String(r.day), Number(r.count || 0)]));
      return orderedDOW.map(label => ({ day: label, count: map.get(label) || 0 }));
    };
    const weekCurrent = fillWeek(weekCurrentRaw);
    const weekPrevious = fillWeek(weekPreviousRaw);

    // Top categories (use category instead of title/topic)
    const [catRows] = await pool.query(
      `SELECT category AS name, COUNT(*) AS count
       FROM consultations
       WHERE advisor_user_id = ? AND status = 'completed' AND category IS NOT NULL AND category <> ''
       GROUP BY category
       ORDER BY count DESC
       LIMIT 10`,
      [advisorId]
    );
    const topTopics = catRows.map(r => ({ name: r.name, count: Number(r.count || 0) }));

    return res.json({
      totalCompleted,
      yearDistribution,
      modeBreakdown: { online: onlineCount, in_person: inPersonCount },
      averageSessionMinutes,
      trend: {
        month: { current: monthCurrent, previous: monthPrevious },
        week: { current: weekCurrent, previous: weekPrevious },
      },
      topTopics,
    });
  } catch (err) {
    console.error('Dashboard summary error', err);
    return res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
});

module.exports = router;

// Admin-wide summary endpoints
// GET /api/dashboard/admin/summary
// Returns organization-wide aggregated metrics for admin dashboard cards
router.get('/admin/summary', authMiddleware, ensureAdmin, async (req, res) => {
  const pool = getPool();
  try {
    const STATUS_ACTIVE = ["requested", "approved", "completed"]; // considered system-wide activity
    // Total completed consultations (all advisors)
    const [[completedRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM consultations WHERE status = 'completed'`
    );
    const totalCompleted = Number(completedRow?.total || 0);

    // Year distribution across all completed consultations
    const [yearRows] = await pool.query(
      `SELECT COALESCE(sp.year_level, '1') AS year_level, COUNT(*) AS count
       FROM consultations c
       LEFT JOIN student_profiles sp ON sp.user_id = c.student_user_id
       WHERE c.status = 'completed'
       GROUP BY sp.year_level`
    );
    const yearDistribution = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const r of yearRows) {
      const y = normalizeYearLevel(r.year_level);
      yearDistribution[y] = Number(r.count || 0);
    }

    // Mode breakdown (online vs in-person for completed)
    const [modeRows] = await pool.query(
      `SELECT mode, COUNT(*) AS count
       FROM consultations
       WHERE status IN ('requested','approved','completed')
       GROUP BY mode`
    );
    let onlineCount = 0, inPersonCount = 0;
    for (const r of modeRows) {
      if (r.mode === 'online') onlineCount = Number(r.count || 0);
      else if (r.mode === 'in-person') inPersonCount = Number(r.count || 0);
    }

    // Average session length (prefer explicit duration_minutes, fallback to timestamp diff)
    const [[avgRow]] = await pool.query(
      `SELECT AVG(CASE WHEN duration_minutes IS NOT NULL THEN duration_minutes
                       ELSE TIMESTAMPDIFF(MINUTE, start_datetime, end_datetime) END) AS avg_minutes
       FROM consultations
       WHERE status = 'completed'`
    );
    const averageSessionMinutes = Math.round(Number(avgRow?.avg_minutes || 0));

    // Trend: monthly (current & previous) - counts per day
    const [[monthNow]] = await pool.query(`SELECT YEAR(CURDATE()) AS y, MONTH(CURDATE()) AS m`);
    const [[monthPrev]] = await pool.query(`SELECT YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AS y, MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AS m`);

    const [monthCurrRows] = await pool.query(
      `SELECT DAY(DATE(CONVERT_TZ(COALESCE(end_datetime, start_datetime), '+00:00', '+08:00'))) AS d, COUNT(*) AS count
       FROM consultations
       WHERE status = 'completed'
         AND YEAR(DATE(CONVERT_TZ(COALESCE(end_datetime, start_datetime), '+00:00', '+08:00'))) = ?
         AND MONTH(DATE(CONVERT_TZ(COALESCE(end_datetime, start_datetime), '+00:00', '+08:00'))) = ?
       GROUP BY DAY(DATE(CONVERT_TZ(COALESCE(end_datetime, start_datetime), '+00:00', '+08:00')))
       ORDER BY d ASC`,
      [monthNow.y, monthNow.m]
    );
    const [monthPrevRows] = await pool.query(
      `SELECT DAY(DATE(CONVERT_TZ(COALESCE(end_datetime, start_datetime), '+00:00', '+08:00'))) AS d, COUNT(*) AS count
       FROM consultations
       WHERE status = 'completed'
         AND YEAR(DATE(CONVERT_TZ(COALESCE(end_datetime, start_datetime), '+00:00', '+08:00'))) = ?
         AND MONTH(DATE(CONVERT_TZ(COALESCE(end_datetime, start_datetime), '+00:00', '+08:00'))) = ?
       GROUP BY DAY(DATE(CONVERT_TZ(COALESCE(end_datetime, start_datetime), '+00:00', '+08:00')))
       ORDER BY d ASC`,
      [monthPrev.y, monthPrev.m]
    );
    const monthCurrentRaw = monthCurrRows.map(r => ({ day: Number(r.d), count: Number(r.count || 0) }));
    const monthPreviousRaw = monthPrevRows.map(r => ({ day: Number(r.d), count: Number(r.count || 0) }));
    const lastDayCurr = new Date(monthNow.y, monthNow.m, 0).getDate();
    const lastDayPrev = new Date(monthPrev.y, monthPrev.m, 0).getDate();
    const fillMonth = (lastDay, rows) => {
      const map = new Map(rows.map(r => [Number(r.day), Number(r.count || 0)]));
      return Array.from({ length: lastDay }, (_, i) => ({ day: i + 1, count: map.get(i + 1) || 0 }));
    };
    const monthCurrent = fillMonth(lastDayCurr, monthCurrentRaw);
    const monthPrevious = fillMonth(lastDayPrev, monthPreviousRaw);

    // Trend: weekly (current & previous) - counts per day-of-week (Sun..Sat)
    const [weekCurrRows] = await pool.query(
      `SELECT DAYOFWEEK(DATE(CONVERT_TZ(COALESCE(end_datetime, start_datetime), '+00:00', '+08:00'))) AS dow, COUNT(*) AS count
       FROM consultations
       WHERE status = 'completed'
         AND YEARWEEK(DATE(CONVERT_TZ(COALESCE(end_datetime, start_datetime), '+00:00', '+08:00')), 1) = YEARWEEK(DATE(CONVERT_TZ(NOW(), '+00:00', '+08:00')), 1)
       GROUP BY DAYOFWEEK(DATE(CONVERT_TZ(COALESCE(end_datetime, start_datetime), '+00:00', '+08:00')))
       ORDER BY dow ASC`
    );
    const [weekPrevRows] = await pool.query(
      `SELECT DAYOFWEEK(DATE(CONVERT_TZ(COALESCE(end_datetime, start_datetime), '+00:00', '+08:00'))) AS dow, COUNT(*) AS count
       FROM consultations
       WHERE status = 'completed'
         AND YEARWEEK(DATE(CONVERT_TZ(COALESCE(end_datetime, start_datetime), '+00:00', '+08:00')), 1) = YEARWEEK(DATE(CONVERT_TZ(DATE_SUB(NOW(), INTERVAL 1 WEEK), '+00:00', '+08:00')), 1)
       GROUP BY DAYOFWEEK(DATE(CONVERT_TZ(COALESCE(end_datetime, start_datetime), '+00:00', '+08:00')))
       ORDER BY dow ASC`
    );
    const dowMap = { 1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat' };
    const weekCurrentRaw = weekCurrRows.map(r => ({ day: dowMap[r.dow] || String(r.dow), count: Number(r.count || 0) }));
    const weekPreviousRaw = weekPrevRows.map(r => ({ day: dowMap[r.dow] || String(r.dow), count: Number(r.count || 0) }));
    const orderedDOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const fillWeek = (rows) => {
      const map = new Map(rows.map(r => [String(r.day), Number(r.count || 0)]));
      return orderedDOW.map(label => ({ day: label, count: map.get(label) || 0 }));
    };
    const weekCurrent = fillWeek(weekCurrentRaw);
    const weekPrevious = fillWeek(weekPreviousRaw);

    // Top topics overall (prefer category; fallback to topic), completed only
    const [topicRows] = await pool.query(
      `SELECT COALESCE(NULLIF(category, ''), NULLIF(topic, '')) AS name, COUNT(*) AS count
       FROM consultations
       WHERE status = 'completed' AND COALESCE(NULLIF(category, ''), NULLIF(topic, '')) IS NOT NULL
       GROUP BY COALESCE(NULLIF(category, ''), NULLIF(topic, ''))
       ORDER BY count DESC
       LIMIT 10`
    );
    const topTopics = topicRows.map(r => ({ name: r.name, count: Number(r.count || 0) }));

    // Status breakdown
    const [statusRows] = await pool.query(
      `SELECT status, COUNT(*) AS count FROM consultations GROUP BY status`
    );
    const statusBreakdown = statusRows.map(r => ({ label: String(r.status), value: Number(r.count || 0) }));

    const studentsByYear = [
      { label: 'First Year', value: Number(yearDistribution[1] || 0) },
      { label: 'Second Year', value: Number(yearDistribution[2] || 0) },
      { label: 'Third Year', value: Number(yearDistribution[3] || 0) },
      { label: 'Fourth Year', value: Number(yearDistribution[4] || 0) },
    ];
    const modeBreakdownArr = [
      { label: 'Online', value: onlineCount },
      { label: 'In Person', value: inPersonCount },
    ];
    const topTopicsArr = topTopics.map(t => ({ label: t.name, value: t.count }));
    return res.json({
      totalCompleted,
      studentsByYear,
      modeBreakdown: modeBreakdownArr,
      averageSessionMinutes,
      trend: {
        month: { current: monthCurrent, previous: monthPrevious },
        week: { current: weekCurrent, previous: weekPrevious },
      },
      topTopics: topTopicsArr,
      statusBreakdown,
    });
  } catch (err) {
    console.error('Admin dashboard summary error', err);
    return res.status(500).json({ error: 'Failed to load admin dashboard summary' });
  }
});

// GET /api/dashboard/admin/monthly-mode
// Returns monthly totals per mode for charting (Jan..Dec)
router.get('/admin/monthly-mode', authMiddleware, ensureAdmin, async (req, res) => {
  const pool = getPool();
  try {
    const [[currYearRow]] = await pool.query(`SELECT YEAR(CURDATE()) AS y`);
    const year = Number(currYearRow?.y || new Date().getFullYear());
    const [rows] = await pool.query(
      `SELECT MONTH(start_datetime) AS m, mode, COUNT(*) AS count
       FROM consultations
       WHERE status IN ('requested','approved','completed') AND YEAR(start_datetime) = ?
       GROUP BY MONTH(start_datetime), mode
       ORDER BY m ASC`,
      [year]
    );
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const agg = Array.from({ length: 12 }, (_, i) => ({ month: months[i], online: 0, inPerson: 0 }));
    for (const r of rows) {
      const idx = Math.max(0, Math.min(11, Number(r.m) - 1));
      if (r.mode === 'online') agg[idx].online = Number(r.count || 0);
      else if (r.mode === 'in-person') agg[idx].inPerson = Number(r.count || 0);
    }
    return res.json({ year, data: agg });
  } catch (err) {
    console.error('Admin monthly-mode error', err);
    return res.status(500).json({ error: 'Failed to load monthly mode totals' });
  }
});
function ensureAdmin(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin access required' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Authorization check failed' });
  }
}
