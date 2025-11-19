const express = require('express');
const { getPool } = require('../db/pool');

const router = express.Router();

// Ensure academic schema exists for term-related routes (idempotent, concurrency-safe)
let academicEnsureLock = null;
async function ensureAcademicSchema(pool) {
  if (academicEnsureLock) return academicEnsureLock;
  academicEnsureLock = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS academic_terms (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      year_label VARCHAR(20) NOT NULL,
      semester_label VARCHAR(10) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_current TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_term (year_label, semester_label),
      KEY idx_term_current (is_current)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`CREATE TABLE IF NOT EXISTS academic_term_memberships (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      term_id INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      role ENUM('student','advisor') NOT NULL,
      status_in_term ENUM('enrolled','dropped','graduated') NOT NULL DEFAULT 'enrolled',
      program_snapshot VARCHAR(255) NULL,
      year_level_snapshot VARCHAR(50) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_term_user (term_id,user_id),
      KEY idx_term_role (term_id,role),
      CONSTRAINT fk_membership_term FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_membership_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    // Ensure consultations has linkage columns (suppress duplicates under race)
    try {
      const [c1] = await pool.query(`SHOW COLUMNS FROM consultations LIKE 'academic_term_id'`);
      if (!c1 || c1.length === 0) {
        await pool.query(`ALTER TABLE consultations ADD COLUMN academic_term_id INT UNSIGNED NULL`);
      }
    } catch (e) { /* ignore */ }
    try { await pool.query(`ALTER TABLE consultations ADD KEY idx_consult_term (academic_term_id)`); } 
    catch (e) { /* ignore duplicate key */ }
    try { await pool.query(`ALTER TABLE consultations ADD CONSTRAINT fk_consult_term FOREIGN KEY (academic_term_id) REFERENCES academic_terms(id) ON DELETE SET NULL ON UPDATE CASCADE`); } 
    catch (e) { /* ignore duplicate fk */ }
    try {
      const [c2] = await pool.query(`SHOW COLUMNS FROM consultations LIKE 'archived_at'`);
      if (!c2 || c2.length === 0) {
        await pool.query(`ALTER TABLE consultations ADD COLUMN archived_at DATETIME NULL`);
      }
    } catch (e) { /* ignore duplicate column */ }
    try {
      const [c3] = await pool.query(`SHOW COLUMNS FROM consultations LIKE 'archive_reason'`);
      if (!c3 || c3.length === 0) {
        await pool.query(`ALTER TABLE consultations ADD COLUMN archive_reason ENUM('graduated','dropped','year_end') NULL`);
      }
    } catch (e) { /* ignore duplicate column */ }
  })().catch((e) => {
    console.warn('[AcademicSchema] ensure failed:', e?.message || e);
  }).finally(() => {
    academicEnsureLock = null;
  });
  return academicEnsureLock;
}

// Automatically ensure schema for all /academic routes
router.use('/academic', async (req, res, next) => {
  const pool = getPool();
  await ensureAcademicSchema(pool);
  next();
});

// Year Levels (admin-managed options for filters)
async function ensureYearLevels(pool) {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS year_levels (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(50) NOT NULL,
      display_order INT UNSIGNED NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_year_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM year_levels');
    const cnt = rows && rows[0] ? Number(rows[0].cnt) : 0;
    if (cnt === 0) {
      await pool.query(`INSERT INTO year_levels (name, display_order) VALUES 
        ('1', 1), ('2', 2), ('3', 3), ('4', 4)`);
    }
  } catch (e) {
    console.warn('[YearLevels] ensure failed:', e?.message || e);
  }
}

router.get('/year-levels', async (req, res) => {
  const pool = getPool();
  try {
    await ensureYearLevels(pool);
    const [rows] = await pool.query('SELECT id, name, display_order FROM year_levels ORDER BY display_order ASC, id ASC');
    res.json(rows || []);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load year levels' });
  }
});

// Ensure the notifications_muted column exists for backward compatibility
async function ensureNotificationsMutedColumn(pool) {
  try {
    const [cols] = await pool.query('SHOW COLUMNS FROM notification_settings LIKE "notifications_muted"');
    if (!cols || cols.length === 0) {
      await pool.query('ALTER TABLE notification_settings ADD COLUMN notifications_muted TINYINT(1) NOT NULL DEFAULT 0');
    }
  } catch (err) {
    // If table doesn't exist yet or other error, ignore; creation path may handle it
    console.warn('ensureNotificationsMutedColumn warning:', err?.message || err);
  }
}

// GET /api/settings/users/:userId/notifications
router.get('/users/:userId/notifications', async (req, res) => {
  const pool = getPool();
  try {
    const userId = Number(req.params.userId);
    await ensureNotificationsMutedColumn(pool);
    const [[row]] = await pool.query(
      `SELECT user_id, email_notifications, consultation_reminders, new_request_notifications, notifications_muted
       FROM notification_settings WHERE user_id = ?`,
      [userId]
    );
    if (!row) {
      return res.json({
        userId,
        emailNotifications: true,
        consultationReminders: true,
        newRequestNotifications: true,
        notificationsMuted: false,
      });
    }
    return res.json({
      userId: row.user_id,
      emailNotifications: !!row.email_notifications,
      consultationReminders: !!row.consultation_reminders,
      newRequestNotifications: !!row.new_request_notifications,
      notificationsMuted: !!row.notifications_muted,
    });
  } catch (err) {
    console.error('Failed to get notification settings:', err);
    res.status(500).json({ error: 'Failed to get notification settings' });
  }
});

// PATCH /api/settings/users/:userId/notifications
router.patch('/users/:userId/notifications', async (req, res) => {
  const pool = getPool();
  try {
    const userId = Number(req.params.userId);
    await ensureNotificationsMutedColumn(pool);
    const { emailNotifications, consultationReminders, newRequestNotifications, notificationsMuted } = req.body || {};
    const [[exists]] = await pool.query('SELECT user_id FROM notification_settings WHERE user_id = ?', [userId]);
    if (exists) {
      await pool.query(
        `UPDATE notification_settings
         SET email_notifications = ?, consultation_reminders = ?, new_request_notifications = ?, notifications_muted = ?
         WHERE user_id = ?`,
        [emailNotifications ? 1 : 0, consultationReminders ? 1 : 0, newRequestNotifications ? 1 : 0, notificationsMuted ? 1 : 0, userId]
      );
    } else {
      await pool.query(
        `INSERT INTO notification_settings (user_id, email_notifications, consultation_reminders, new_request_notifications, notifications_muted)
         VALUES (?,?,?,?,?)`,
        [userId, emailNotifications ? 1 : 0, consultationReminders ? 1 : 0, newRequestNotifications ? 1 : 0, notificationsMuted ? 1 : 0]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update notification settings:', err);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// GET /api/settings/advisors/:userId
router.get('/advisors/:userId', async (req, res) => {
  const pool = getPool();
  try {
    const advisorId = Number(req.params.userId);
    const [[row]] = await pool.query(
      `SELECT advisor_user_id, default_consultation_duration
       FROM advisor_settings WHERE advisor_user_id = ?`,
      [advisorId]
    );
    if (!row) {
      return res.json({
        advisorUserId: advisorId,
        defaultConsultationDuration: null,
      });
    }
    return res.json({
      advisorUserId: row.advisor_user_id,
      defaultConsultationDuration: row.default_consultation_duration != null ? Number(row.default_consultation_duration) : null,
    });
  } catch (err) {
    console.error('Failed to get advisor settings:', err);
    res.status(500).json({ error: 'Failed to get advisor settings' });
  }
});

// PATCH /api/settings/advisors/:userId
router.patch('/advisors/:userId', async (req, res) => {
  const pool = getPool();
  try {
    const advisorId = Number(req.params.userId);
    const { defaultConsultationDuration } = req.body || {};
    const [[exists]] = await pool.query('SELECT advisor_user_id FROM advisor_settings WHERE advisor_user_id = ?', [advisorId]);
    if (exists) {
      await pool.query(
        `UPDATE advisor_settings
         SET default_consultation_duration = ?
         WHERE advisor_user_id = ?`,
        [(defaultConsultationDuration != null ? Number(defaultConsultationDuration) : null), advisorId]
      );
    } else {
      await pool.query(
        `INSERT INTO advisor_settings (advisor_user_id, default_consultation_duration)
         VALUES (?,?)`,
        [advisorId, (defaultConsultationDuration != null ? Number(defaultConsultationDuration) : null)]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update advisor settings:', err);
    res.status(500).json({ error: 'Failed to update advisor settings' });
  }
});

// Academic Terms CRUD
// GET /api/settings/academic/terms
router.get('/academic/terms', async (req, res) => {
  const pool = getPool();
  try {
    const [rows] = await pool.query(
      `SELECT id, year_label, semester_label, start_date, end_date, is_current
       FROM academic_terms
       ORDER BY is_current DESC, start_date DESC, id DESC`
    );
    res.json(rows || []);
  } catch (err) {
    console.error('Failed to fetch academic terms:', err);
    res.status(500).json({ error: 'Failed to fetch academic terms' });
  }
});

// POST /api/settings/academic/terms
router.post('/academic/terms', async (req, res) => {
  const pool = getPool();
  try {
    const body = req.body || {};
    let year_label = body.yearLabel;
    let semester_label = body.semesterLabel;
    let start_date = body.startDate;
    let end_date = body.endDate;
    const isCurrent = !!body.isCurrent;

    // New payload path: { yearFrom, yearTo, termType, startMonthDay, endMonthDay, isCurrent }
    if (body.yearFrom && body.yearTo && body.termType && body.startMonthDay && body.endMonthDay) {
      const yf = Number(body.yearFrom); const yt = Number(body.yearTo);
      if (!Number.isFinite(yf) || !Number.isFinite(yt) || yt <= yf) {
        return res.status(400).json({ error: 'Invalid School Year (To must be greater than From)' });
      }
      const termType = String(body.termType).toLowerCase();
      if (!['first','second','summer'].includes(termType)) {
        return res.status(400).json({ error: 'termType must be first|second|summer' });
      }
      const smd = String(body.startMonthDay);
      const emd = String(body.endMonthDay);
      const sm = Number(smd.slice(0,2));
      const em = Number(emd.slice(0,2));
      if (!/^[0-1][0-9]-[0-3][0-9]$/.test(smd) || !/^[0-1][0-9]-[0-3][0-9]$/.test(emd)) {
        return res.status(400).json({ error: 'startMonthDay/endMonthDay must be MM-DD' });
      }
      const startYear = (sm >= 7 ? yf : yt);
      let endYear = (em >= 7 ? yf : yt);
      const sd = new Date(`${startYear}-${smd}`);
      let ed = new Date(`${endYear}-${emd}`);
      if (sd.getTime() > ed.getTime()) {
        // If end earlier than start, project end to next boundary
        endYear = yt; ed = new Date(`${endYear}-${emd}`);
      }
      year_label = `${yf}-${yt}`;
      semester_label = termType === 'first' ? 'First' : termType === 'second' ? 'Second' : 'Summer';
      start_date = `${startYear}-${smd}`;
      end_date = `${endYear}-${emd}`;
    }

    // Backward compatibility path requires fields to be present
    if (!year_label || !semester_label || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing fields. Provide either legacy (yearLabel, semesterLabel, startDate, endDate) or new payload (yearFrom, yearTo, termType, startMonthDay, endMonthDay).' });
    }

    const [r] = await pool.query(
      `INSERT INTO academic_terms (year_label, semester_label, start_date, end_date, is_current)
       VALUES (?,?,?,?,?)`,
      [String(year_label), String(semester_label), start_date, end_date, isCurrent ? 1 : 0]
    );
    if (isCurrent) {
      await pool.query('UPDATE academic_terms SET is_current = CASE WHEN id = ? THEN 1 ELSE 0 END', [r.insertId]);
    }
    const [[row]] = await pool.query('SELECT * FROM academic_terms WHERE id = ?', [r.insertId]);
    res.status(201).json(row);
  } catch (err) {
    console.error('Failed to create academic term:', err);
    res.status(500).json({ error: 'Failed to create academic term' });
  }
});

// PATCH /api/settings/academic/terms/:id
router.patch('/academic/terms/:id', async (req, res) => {
  const pool = getPool();
  try {
    const termId = Number(req.params.id);
    const { yearLabel, semesterLabel, startDate, endDate, isCurrent } = req.body || {};
    const sets = [];
    const vals = [];
    if (typeof yearLabel === 'string') { sets.push('year_label = ?'); vals.push(yearLabel); }
    if (typeof semesterLabel === 'string') { sets.push('semester_label = ?'); vals.push(semesterLabel); }
    if (typeof startDate === 'string') { sets.push('start_date = ?'); vals.push(startDate); }
    if (typeof endDate === 'string') { sets.push('end_date = ?'); vals.push(endDate); }
    if (typeof isCurrent === 'boolean') { sets.push('is_current = ?'); vals.push(isCurrent ? 1 : 0); }
    if (sets.length === 0) return res.json({ success: true });
    vals.push(termId);
    await pool.query(`UPDATE academic_terms SET ${sets.join(', ')} WHERE id = ?`, vals);
    if (typeof isCurrent === 'boolean' && isCurrent) {
      await pool.query('UPDATE academic_terms SET is_current = CASE WHEN id = ? THEN 1 ELSE 0 END', [termId]);
    }
    const [[row]] = await pool.query('SELECT * FROM academic_terms WHERE id = ?', [termId]);
    res.json(row || { success: true });
  } catch (err) {
    console.error('Failed to update academic term:', err);
    res.status(500).json({ error: 'Failed to update academic term' });
  }
});

// DELETE /api/settings/academic/terms/:id
router.delete('/academic/terms/:id', async (req, res) => {
  const pool = getPool();
  try {
    const termId = Number(req.params.id);
    const [[row]] = await pool.query('SELECT is_current FROM academic_terms WHERE id = ?', [termId]);
    if (!row) return res.status(404).json({ error: 'Term not found' });
    if (Number(row.is_current) === 1) return res.status(400).json({ error: 'Cannot delete the current term' });
    await pool.query('DELETE FROM academic_terms WHERE id = ?', [termId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete academic term:', err);
    res.status(500).json({ error: 'Failed to delete academic term' });
  }
});

// PATCH /api/settings/academic/current-term
router.patch('/academic/current-term', async (req, res) => {
  const pool = getPool();
  try {
    const { termId } = req.body || {};
    if (!termId) return res.status(400).json({ error: 'termId is required' });
    const [[row]] = await pool.query('SELECT id FROM academic_terms WHERE id = ?', [termId]);
    if (!row) return res.status(404).json({ error: 'Term not found' });
    await pool.query('UPDATE academic_terms SET is_current = CASE WHEN id = ? THEN 1 ELSE 0 END', [termId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to set current term:', err);
    res.status(500).json({ error: 'Failed to set current term' });
  }
});

// GET /api/academic/terms/:termId/members?role=student|advisor
router.get('/academic/terms/:termId/members', async (req, res) => {
  const pool = getPool();
  try {
    const termId = Number(req.params.termId);
    const role = String(req.query.role || '').toLowerCase() === 'advisor' ? 'advisor' : 'student';
    if (!termId) return res.status(400).json({ error: 'termId required' });
    if (role === 'student') {
      const [rows] = await pool.query(
        `SELECT m.user_id AS id, u.full_name AS name, u.email, 'student' AS role,
                sp.program, sp.year_level, sp.avatar_url, m.status_in_term,
                m.program_snapshot, m.year_level_snapshot
         FROM academic_term_memberships m
         JOIN users u ON u.id = m.user_id
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         WHERE m.term_id = ? AND m.role = 'student'
         ORDER BY u.full_name ASC`, [termId]
      );
      return res.json(rows || []);
    } else {
      const [rows] = await pool.query(
        `SELECT m.user_id AS id, u.full_name AS name, u.email, 'advisor' AS role,
                ap.department, ap.title, ap.avatar_url, m.status_in_term
         FROM academic_term_memberships m
         JOIN users u ON u.id = m.user_id
         LEFT JOIN advisor_profiles ap ON ap.user_id = u.id
         WHERE m.term_id = ? AND m.role = 'advisor'
         ORDER BY u.full_name ASC`, [termId]
      );
      return res.json(rows || []);
    }
  } catch (err) {
    console.error('Failed to list term members:', err);
    res.status(500).json({ error: 'Failed to list term members' });
  }
});

// POST /api/academic/terms/:termId/members { userIds[], role }
router.post('/academic/terms/:termId/members', async (req, res) => {
  const pool = getPool();
  try {
    const termId = Number(req.params.termId);
    const { userIds, role } = req.body || {};
    const r = String(role || '').toLowerCase() === 'advisor' ? 'advisor' : 'student';
    if (!termId || !Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ error: 'termId and userIds required' });
    // Build insert values with snapshots
    const values = [];
    if (r === 'student') {
      const [rows] = await pool.query(`SELECT user_id, program, year_level FROM student_profiles WHERE user_id IN (${userIds.map(()=>'?').join(',')})`, userIds);
      const byId = new Map(rows.map(x => [Number(x.user_id), x]));
      for (const id of userIds.map(Number)) {
        const sp = byId.get(id) || {};
        values.push([termId, id, 'student', 'enrolled', sp.program || null, sp.year_level || null]);
      }
    } else {
      for (const id of userIds.map(Number)) {
        values.push([termId, id, 'advisor', 'enrolled', null, null]);
      }
    }
    await pool.query(
      `INSERT IGNORE INTO academic_term_memberships(term_id,user_id,role,status_in_term,program_snapshot,year_level_snapshot)
       VALUES ${values.map(()=>'(?,?,?,?,?,?)').join(',')}`, values.flat()
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to add term members:', err);
    res.status(500).json({ error: 'Failed to add term members' });
  }
});

// DELETE /api/academic/terms/:termId/members { userIds[] }
router.delete('/academic/terms/:termId/members', async (req, res) => {
  const pool = getPool();
  try {
    const termId = Number(req.params.termId);
    const { userIds } = req.body || {};
    if (!termId || !Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ error: 'termId and userIds required' });
    await pool.query(
      `DELETE FROM academic_term_memberships WHERE term_id = ? AND user_id IN (${userIds.map(()=>'?').join(',')})`,
      [termId, ...userIds.map(Number)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to remove term members:', err);
    res.status(500).json({ error: 'Failed to remove term members' });
  }
});

// PATCH /api/settings/academic/terms/:termId/members/status { userId, status_in_term }
router.patch('/academic/terms/:termId/members/status', async (req, res) => {
  const pool = getPool();
  try {
    const termId = Number(req.params.termId);
    const { userId, status_in_term } = req.body || {};
    if (!termId || !userId) return res.status(400).json({ error: 'termId and userId required' });
    const allowed = ['enrolled','dropped','graduated'];
    const s = String(status_in_term || '').toLowerCase();
    if (!allowed.includes(s)) return res.status(400).json({ error: 'Invalid status_in_term' });
    const [r] = await pool.query(
      `UPDATE academic_term_memberships SET status_in_term = ? WHERE term_id = ? AND user_id = ?`,
      [s, termId, Number(userId)]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Membership not found' });
    return res.json({ success: true, status_in_term: s });
  } catch (err) {
    console.error('Failed to update member term status:', err);
    res.status(500).json({ error: 'Failed to update member term status' });
  }
});

// POST /api/academic/terms/:termId/promote { toTermId }
router.post('/academic/terms/:termId/promote', async (req, res) => {
  const pool = getPool();
  try {
    const fromTermId = Number(req.params.termId);
    const { toTermId, program, year, userIds } = req.body || {};
    if (!fromTermId || !toTermId) return res.status(400).json({ error: 'fromTermId and toTermId required' });
    let rows;
    if (Array.isArray(userIds) && userIds.length > 0) {
      const ids = userIds.map(Number).filter(Number.isFinite);
      const [r] = await pool.query(
        `SELECT user_id, program_snapshot, year_level_snapshot
         FROM academic_term_memberships
         WHERE term_id = ? AND role = 'student' AND status_in_term = 'enrolled'
           AND user_id IN (${ids.map(()=>'?').join(',')})`,
        [fromTermId, ...ids]
      );
      rows = r;
    } else {
      const whereExtra = [];
      const params = [fromTermId];
      if (program) { whereExtra.push('AND program_snapshot = ?'); params.push(String(program)); }
      if (year) { whereExtra.push('AND year_level_snapshot = ?'); params.push(String(year)); }
      const [r] = await pool.query(
        `SELECT user_id, program_snapshot, year_level_snapshot
         FROM academic_term_memberships
         WHERE term_id = ? AND role = 'student' AND status_in_term = 'enrolled' ${whereExtra.join(' ')}`,
        params
      );
      rows = r;
    }
    if (!rows.length) return res.json({ success: true, advancedCount: 0, graduatedCount: 0 });

    const toAdvance = [];
    const toGraduate = [];
    for (const r of rows) {
      const currY = Number(r.year_level_snapshot) || 1;
      if (currY >= 4) toGraduate.push(r);
      else toAdvance.push(r);
    }

    // Insert next-term memberships for those advancing (increment year snapshot)
    if (toAdvance.length) {
      const values = toAdvance.map(r => [toTermId, r.user_id, 'student', 'enrolled', r.program_snapshot || null, String((Number(r.year_level_snapshot) || 1) + 1)]);
      await pool.query(
        `INSERT IGNORE INTO academic_term_memberships(term_id,user_id,role,status_in_term,program_snapshot,year_level_snapshot)
         VALUES ${values.map(()=>'(?,?,?,?,?,?)').join(',')}`,
        values.flat()
      );
    }

    // For terminal year (4th year) students: mark graduated and set inactive
    if (toGraduate.length) {
      const gradIds = toGraduate.map(r => Number(r.user_id)).filter(Number.isFinite);
      // Update previous term membership to graduated
      await pool.query(
        `UPDATE academic_term_memberships SET status_in_term = 'graduated' WHERE term_id = ? AND role = 'student' AND user_id IN (${gradIds.map(()=>'?').join(',')})`,
        [fromTermId, ...gradIds]
      );
      // Set users inactive
      await pool.query(`UPDATE users SET status = 'inactive' WHERE id IN (${gradIds.map(()=>'?').join(',')})`, gradIds);
      // Audit events
      try {
        await pool.query(
          `INSERT INTO user_deactivation_events (user_id, term_id, reason, other_reason)
           VALUES ${gradIds.map(()=>'(?,?,?,?)').join(',')}`,
          gradIds.flatMap(id => [id, fromTermId, 'graduated', null])
        );
      } catch (_) { /* ignore */ }
    }

    res.json({ success: true, advancedCount: toAdvance.length, graduatedCount: toGraduate.length });
  } catch (err) {
    console.error('Failed to promote cohort:', err);
    res.status(500).json({ error: 'Failed to promote cohort' });
  }
});

// POST /api/settings/academic/terms/:termId/ensure-members
// Body: { program?, year?, onlyActive?: boolean, recentActivityDays?: number, dryRun?: boolean }
router.post('/academic/terms/:termId/ensure-members', async (req, res) => {
  const pool = getPool();
  try {
    const termId = Number(req.params.termId);
    if (!termId) return res.status(400).json({ error: 'termId required' });
    const { program, year, onlyActive = true, recentActivityDays, dryRun = false } = req.body || {};

    const where = ["u.role = 'student'"];
    const params = [];
    if (onlyActive) where.push("u.status = 'active'");
    if (program) { where.push('sp.program = ?'); params.push(String(program)); }
    if (year) { where.push('sp.year_level = ?'); params.push(String(year)); }

    let activityJoin = '';
    if (recentActivityDays && Number(recentActivityDays) > 0) {
      activityJoin = ` JOIN consultations c ON c.student_user_id = u.id AND c.start_datetime >= DATE_SUB(NOW(), INTERVAL ${Number(recentActivityDays)} DAY)`;
    }

    const [candidates] = await pool.query(
      `SELECT DISTINCT u.id AS user_id, sp.program, sp.year_level
       FROM users u
       JOIN student_profiles sp ON sp.user_id = u.id
       ${activityJoin}
       WHERE ${where.join(' AND ')}
       ORDER BY u.id ASC`,
      params
    );

    const ids = candidates.map(r => Number(r.user_id)).filter(Number.isFinite);
    if (!ids.length) return res.json({ success: true, totalCandidates: 0, alreadyMembers: 0, toInsert: 0, inserted: 0 });

    const [existing] = await pool.query(
      `SELECT user_id FROM academic_term_memberships WHERE term_id = ? AND role = 'student' AND user_id IN (${ids.map(()=>'?').join(',')})`,
      [termId, ...ids]
    );
    const existingSet = new Set(existing.map(r => Number(r.user_id)));
    const toInsertRows = candidates.filter(r => !existingSet.has(Number(r.user_id)));

    if (dryRun) {
      return res.json({ success: true, totalCandidates: ids.length, alreadyMembers: existingSet.size, toInsert: toInsertRows.length, inserted: 0 });
    }

    if (toInsertRows.length) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const values = [];
        const toActivateIds = [];
        for (const r of toInsertRows) {
          const uid = Number(r.user_id);
          values.push([termId, uid, 'student', 'enrolled', r.program || null, r.year_level != null ? String(r.year_level) : null]);
          toActivateIds.push(uid);
        }
        await conn.query(
          `INSERT IGNORE INTO academic_term_memberships (term_id,user_id,role,status_in_term,program_snapshot,year_level_snapshot)
           VALUES ${values.map(()=>'(?,?,?,?,?,?)').join(',')}`,
          values.flat()
        );

        // Activate any inactive students being added to the term
        if (toActivateIds.length) {
          await conn.query(
            `UPDATE users SET status = 'active' WHERE role = 'student' AND id IN (${toActivateIds.map(()=>'?').join(',')})`,
            toActivateIds
          );
          // Normalize membership status to 'enrolled' in case of previous 'dropped'/'graduated'
          await conn.query(
            `UPDATE academic_term_memberships SET status_in_term = 'enrolled' WHERE term_id = ? AND role = 'student' AND user_id IN (${toActivateIds.map(()=>'?').join(',')})`,
            [termId, ...toActivateIds]
          );
        }

        await conn.commit();
      } catch (err) {
        try { await conn.rollback(); } catch (_) {}
        throw err;
      } finally {
        conn.release();
      }
    }
    return res.json({ success: true, totalCandidates: ids.length, alreadyMembers: existingSet.size, toInsert: toInsertRows.length, inserted: toInsertRows.length });
  } catch (err) {
    console.error('Ensure members failed:', err);
    res.status(500).json({ error: 'Failed to ensure term members' });
  }
});

module.exports = router;

// Consultation modes (online/in-person)
router.patch('/advisors/:userId/modes', async (req, res) => {
  const pool = getPool();
  try {
    const advisorId = Number(req.params.userId);
    const { onlineEnabled, inPersonEnabled } = req.body || {};
    const [[exists]] = await pool.query('SELECT advisor_user_id FROM advisor_modes WHERE advisor_user_id = ?', [advisorId]);
    if (exists) {
      await pool.query(
        `UPDATE advisor_modes SET online_enabled = ?, in_person_enabled = ? WHERE advisor_user_id = ?`,
        [onlineEnabled ? 1 : 0, inPersonEnabled ? 1 : 0, advisorId]
      );
    } else {
      await pool.query(
        `INSERT INTO advisor_modes (advisor_user_id, online_enabled, in_person_enabled) VALUES (?,?,?)`,
        [advisorId, onlineEnabled ? 1 : 0, inPersonEnabled ? 1 : 0]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update advisor modes:', err);
    res.status(500).json({ error: 'Failed to update advisor modes' });
  }
});

// Weekly availability settings (overwrite per-day ranges)
router.patch('/advisors/:userId/availability', async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    const advisorId = Number(req.params.userId);
    const { days } = req.body || {};
    if (!days || typeof days !== 'object') return res.status(400).json({ error: 'Body must include days object' });
    await conn.beginTransaction();
    await conn.query('DELETE FROM advisor_availability WHERE advisor_user_id = ?', [advisorId]);
    const validDays = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    for (const d of validDays) {
      const v = days[d];
      if (v && v.start && v.end) {
        await conn.query(
          `INSERT INTO advisor_availability (advisor_user_id, day_of_week, start_time, end_time) VALUES (?,?,?,?)`,
          [advisorId, d, v.start, v.end]
        );
      }
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('Failed to update weekly availability:', err);
    res.status(500).json({ error: 'Failed to update weekly availability' });
  } finally {
    conn.release();
  }
});
