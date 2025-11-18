try { require('dotenv').config(); } catch (_) {}
const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const { getPool } = require('./db/pool');
const bcrypt = require('bcrypt');

const app = express();

const corsOrigins = (process.env.CORS_ORIGINS || process.env.APP_BASE_URL || '')
  .split(',')
  .map((s) => String(s).trim())
  .filter(Boolean);
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (!corsOrigins.length) return cb(null, true);
    if (corsOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

// Global error handlers to avoid hard crashes on startup
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
});

// Serve uploaded files statically under /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// routes (mount defensively so startup never crashes on missing modules)
function mount(prefix, modPath) {
  try {
    const router = require(modPath);
    app.use(prefix, router);
    console.log(`[Routes] Mounted ${modPath} at ${prefix}`);
  } catch (err) {
    console.error(`[Routes] Failed to mount ${modPath} at ${prefix}:`, err?.message || err);
  }
}
mount('/api/auth', './routes/auth');
mount('/api/users', './routes/users');
mount('/api/advisors', './routes/advisors');
mount('/api', './routes/consultations');
mount('/api/profile', './routes/profile');
mount('/api/availability', './routes/availability');
mount('/api/dashboard', './routes/dashboard');
mount('/api/notifications', './routes/notifications');
mount('/api/settings', './routes/settings');
mount('/api', './routes/transcriptions');
mount('/api/uploads', './routes/uploads');
mount('/api/departments', './routes/departments');
mount('/api/programs', './routes/programs');
mount('/api', './routes/ai_debug');
mount('/api/stream', './routes/stream');
mount('/api/diag', './routes/diagnostics');

const SKIP_STARTUP_DB_ENSURE = String(process.env.SKIP_STARTUP_DB_ENSURE || 'false').toLowerCase() === 'true';

// Ensure critical auxiliary tables exist early to avoid race conditions
if (!SKIP_STARTUP_DB_ENSURE) (async () => {
  try {
    const pool = getPool();
    await pool.query(`CREATE TABLE IF NOT EXISTS user_deactivation_events (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NOT NULL,
      term_id INT UNSIGNED NULL,
      reason ENUM('graduated','dropped','other') NOT NULL,
      other_reason VARCHAR(255) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_user (user_id),
      KEY idx_term (term_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    console.log('[DB] Ensured user_deactivation_events table');
  } catch (e) {
    console.warn('[DB] Could not ensure user_deactivation_events table:', e?.message || e);
  }
})();

// Ensure auth auxiliary tables exist (email_verifications, password_resets)
if (!SKIP_STARTUP_DB_ENSURE) (async () => {
  try {
    const pool = getPool();
    await pool.query(`CREATE TABLE IF NOT EXISTS email_verifications (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NOT NULL,
      code_hash VARCHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      consumed_at DATETIME NULL,
      resend_count INT UNSIGNED NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_email_verif_user (user_id),
      KEY idx_email_verif_expires (expires_at),
      CONSTRAINT fk_email_verif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`CREATE TABLE IF NOT EXISTS password_resets (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NOT NULL,
      token_hash VARCHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_password_resets_user (user_id),
      KEY idx_password_resets_token (token_hash),
      CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    console.log('[DB] Ensured auth auxiliary tables');
  } catch (e) {
    console.warn('[DB] Could not ensure auth auxiliary tables:', e?.message || e);
  }
})();

// Auto-migrate database on server start (optional)
let autoMigrate = null;
try {
  ({ autoMigrate } = require('./db/auto_migrate'));
} catch (e) {
  console.warn('[AutoMigrate] Module not found, skipping:', e?.message || e);
}

// test route
app.get('/', (req, res) => res.send('AdviSys backend is running 🚀'));
// health check for Cloud Run
  app.get('/healthz', (req, res) => res.status(200).json({ ok: true }));
  app.get('/api/diag-email', async (req, res) => {
    const MAILJET_API_KEY = (process.env.MAILJET_API_KEY || '').trim();
    const MAILJET_API_SECRET = (process.env.MAILJET_API_SECRET || '').trim();
    const MAIL_FROM = (process.env.MAIL_FROM || '').trim();
    const envOk = Boolean(MAILJET_API_KEY && MAILJET_API_SECRET && MAIL_FROM);
    function checkHttps(hostname) {
      return new Promise((resolve) => {
        const rq = https.request({ hostname, method: 'HEAD', path: '/', timeout: 8000 }, (r) => {
          resolve({ ok: true, statusCode: r.statusCode || 0 });
        });
        rq.on('timeout', () => {
          rq.destroy(new Error('timeout'));
        });
        rq.on('error', (e) => {
          resolve({ ok: false, error: e.message || String(e) });
        });
        rq.end();
      });
    }
    const net = await checkHttps('api.mailjet.com');
    res.json({ envOk, net });
  });

// Temporary debug: list registered routes (method and path)
// NOTE: This is for debugging and can be removed later.
app.get('/api/__routes', (req, res) => {
  try {
    const routes = [];
    const stack = app._router?.stack || [];
    for (const layer of stack) {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods)
          .filter(m => layer.route.methods[m])
          .map(m => m.toUpperCase());
        routes.push({ methods, path: layer.route.path });
      } else if (layer.name === 'router' && layer.handle?.stack) {
        const base = layer.regexp?.fast_star ? '' : (layer.regexp && layer.regexp.source ? null : null);
        for (const r of layer.handle.stack) {
          if (r.route && r.route.path) {
            const methods = Object.keys(r.route.methods)
              .filter(m => r.route.methods[m])
              .map(m => m.toUpperCase());
            // Try to infer mount path if available
            const path = r.route.path;
            routes.push({ methods, path });
          }
        }
      }
    }
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to enumerate routes' });
  }
});

// Manual trigger endpoint for reminder job (useful for verification/tests)
app.get('/api/consultations/reminders/run', async (req, res) => {
  try {
    await runConsultationReminderJob();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run reminder job' });
  }
});

// --- Consultation Reminder Background Job ---
// Sends notifications to both student and advisor when a consultation is near.
// Respects each user's notification settings (consultation_reminders) and avoids duplicates.
// Support multiple reminder thresholds (e.g., 30 and 5 minutes)
const REMINDER_THRESHOLDS = (process.env.REMINDER_THRESHOLDS || '30,5')
  .split(',')
  .map(v => Number(String(v).trim()))
  .filter(n => Number.isFinite(n) && n > 0);
// Window should be the max threshold to ensure we pick up upcoming consultations
const REMINDER_WINDOW_MINUTES = Number(
  process.env.REMINDER_WINDOW_MINUTES || (REMINDER_THRESHOLDS.length ? Math.max(...REMINDER_THRESHOLDS) : 30)
);
const REMINDER_POLL_MS = Number(process.env.REMINDER_POLL_MS || 60_000); // 1 minute
let reminderJobRunning = false;

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

const { notify, getNotificationSettings } = require('./services/notifications');

async function runConsultationReminderJob() {
  if (reminderJobRunning) return; // prevent overlap
  reminderJobRunning = true;
  const pool = getPool();
  try {
    // Helper to read reminder setting safely; defaults to true if table/row missing
    async function getConsultationRemindersEnabled(userId) {
      try {
        const [[row]] = await pool.query(
          `SELECT consultation_reminders FROM notification_settings WHERE user_id = ?`,
          [userId]
        );
        if (!row || row.consultation_reminders === undefined || row.consultation_reminders === null) {
          return true;
        }
        return !!row.consultation_reminders;
      } catch (err) {
        // Gracefully handle missing table or other read errors by enabling reminders by default
        if (err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146)) {
          return true;
        }
        console.warn('Reminder settings read error for user', userId, err?.message || err);
        return true;
      }
    }
    // Load consultations starting within the next REMINDER_WINDOW_MINUTES
    const [rows] = await pool.query(
      `SELECT c.id, c.student_user_id, c.advisor_user_id, c.topic, c.start_datetime, c.end_datetime, c.status,
              s.full_name AS student_name, a.full_name AS advisor_name, c.room_name, c.location
         FROM consultations c
         JOIN users s ON s.id = c.student_user_id
         JOIN users a ON a.id = c.advisor_user_id
        WHERE c.status = 'approved'
          AND c.start_datetime BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? MINUTE)`,
      [REMINDER_WINDOW_MINUTES]
    );

    const now = new Date();
    for (const c of rows) {
      const start = new Date(c.start_datetime);
      const end = new Date(c.end_datetime);
      const minsUntil = Math.max(0, Math.ceil((start.getTime() - now.getTime()) / 60000));
      const date = formatDate(start);
      const time = formatTimeRange(start, end);

      // Check settings (default true when table/row missing)
      const studentEnabled = await getConsultationRemindersEnabled(c.student_user_id);
      const advisorEnabled = await getConsultationRemindersEnabled(c.advisor_user_id);

      // Helper to ensure we don't duplicate reminders for the same consultation/user
      async function hasExistingReminder(userId, thresholdMin) {
        try {
          const [[existing]] = await pool.query(
            `SELECT id FROM notifications
              WHERE user_id = ? AND type = 'consultation_reminder'
                AND JSON_EXTRACT(data_json, '$.consultation_id') = ?
                AND JSON_EXTRACT(data_json, '$.threshold_minutes') = ?
              LIMIT 1`,
            [userId, c.id, thresholdMin]
          );
          return !!existing;
        } catch (_) {
          // Fallback: if JSON_EXTRACT unsupported, allow creation; client will mark read later
          return false;
        }
      }

      // Iterate thresholds (e.g., 30 and 5) and send reminders per threshold without duplicates
      const thresholds = REMINDER_THRESHOLDS.length ? REMINDER_THRESHOLDS : [REMINDER_WINDOW_MINUTES];
      for (const thresholdMin of thresholds) {
        if (minsUntil > thresholdMin) continue; // not within this threshold yet

        const data = {
          consultation_id: c.id,
          date,
          time,
          minutes_until: minsUntil,
          threshold_minutes: thresholdMin,
          room_name: c.room_name || null,
          location: c.location || null,
        };

        // Student reminder for this threshold
        if (studentEnabled && !(await hasExistingReminder(c.student_user_id, thresholdMin))) {
          const title = `Upcoming consultation with ${c.advisor_name}`;
          const baseWhere = c.room_name ? 'Online meeting room will be available.' : (c.location ? `Location: ${c.location}.` : '');
          const guidance = c.room_name
            ? (minsUntil > 0
                ? 'Your advisor will start the call at the scheduled time. Join via the Stream video room in-app.'
                : 'If access errors occur, refresh or wait a moment — the room opens when your advisor starts the call.')
            : (c.location ? 'Arrive a few minutes early and bring any required materials.' : '');
          const message = `Your consultation '${c.topic}' is scheduled for ${date} at ${time}. Starts in ${minsUntil} minutes. ${baseWhere} ${guidance}`.trim();
          await notify(pool, c.student_user_id, 'consultation_reminder', title, message, data);
        }

        // Advisor reminder for this threshold
        if (advisorEnabled && !(await hasExistingReminder(c.advisor_user_id, thresholdMin))) {
          const title = `Upcoming consultation with ${c.student_name}`;
          const baseWhere = c.room_name ? 'Meeting room will be available.' : (c.location ? `Location: ${c.location}.` : '');
          const guidance = c.room_name
            ? (minsUntil > 0
                ? 'Start the meeting at the scheduled time so students can join on time.'
                : 'If students report access errors, ensure you are signed in and the Stream video room is started.')
            : (c.location ? 'Please be on-site a few minutes early.' : '');
          const message = `You have a consultation for '${c.topic}' on ${date} at ${time}. Starts in ${minsUntil} minutes. ${baseWhere} ${guidance}`.trim();
          await notify(pool, c.advisor_user_id, 'consultation_reminder', title, message, data);
        }
      }
    }
  } catch (err) {
    console.error('Consultation reminder job error', err);
  } finally {
    reminderJobRunning = false;
  }
}

// Kick off periodic job
setInterval(runConsultationReminderJob, REMINDER_POLL_MS);

// --- Missed Consultation Background Job ---
// Automatically marks consultations as 'missed' when their end time has passed
// and sends detailed notifications including no-show duration.
const MISSED_POLL_MS = Number(process.env.MISSED_POLL_MS || 60_000); // 1 minute
let missedJobRunning = false;

async function runMissedConsultationJob() {
  if (missedJobRunning) return; // prevent overlap
  missedJobRunning = true;
  const pool = getPool();
  try {
    // Find consultations that are approved and already ended
    const [rows] = await pool.query(
      `SELECT c.id, c.student_user_id, c.advisor_user_id, c.topic, c.start_datetime, c.end_datetime, c.status,
              c.duration_minutes,
              s.full_name AS student_name, a.full_name AS advisor_name
         FROM consultations c
         JOIN users s ON s.id = c.student_user_id
         JOIN users a ON a.id = c.advisor_user_id
        WHERE c.status = 'approved'
          AND c.end_datetime < NOW()`
    );

    const now = new Date();
    for (const c of rows) {
      // Double-check current status to avoid race conditions
      const [[current]] = await pool.query('SELECT status, start_datetime, end_datetime, duration_minutes FROM consultations WHERE id = ?', [c.id]);
      if (!current) continue;
      const currStatus = String(current.status || '').toLowerCase();
      if (currStatus !== 'approved') continue; // already handled elsewhere

      const start = new Date(current.start_datetime || c.start_datetime);
      const end = new Date(current.end_datetime || c.end_datetime);
      const durationFromRow = Number(current.duration_minutes || c.duration_minutes || 0) || null;
      const date = formatDate(start);
      const time = formatTimeRange(start, end);

      // Compute no-show minutes: prefer actual time since scheduled start,
      // but cap at the scheduled duration if available.
      const elapsedMins = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / 60000));
      const scheduledDurationMins = durationFromRow ?? Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 60000));
      const minutesNoShow = Math.max(0, Math.min(elapsedMins, scheduledDurationMins));

      // Mark as missed
      await pool.query('UPDATE consultations SET status = ? WHERE id = ?', ['missed', c.id]);

      const data = {
        consultation_id: c.id,
        date,
        time,
        minutes_no_show: minutesNoShow,
        start_datetime: start,
        end_datetime: end,
      };

      const title = 'Consultation missed';
      const detail = minutesNoShow > 0
        ? ` No-show duration: ${minutesNoShow} minute${minutesNoShow === 1 ? '' : 's'} from the scheduled start.`
        : '';
      const message = `The consultation '${c.topic}' scheduled for ${date} at ${time} was missed.${detail}`.trim();

      await notify(pool, c.student_user_id, 'consultation_missed', title, message, data);
      await notify(pool, c.advisor_user_id, 'consultation_missed', title, message, data);
    }
  } catch (err) {
    console.error('Missed consultation job error', err);
  } finally {
    missedJobRunning = false;
  }
}

// Kick off periodic missed job
setInterval(runMissedConsultationJob, MISSED_POLL_MS);

// Manual trigger endpoint for missed job (useful for verification/tests)
app.get('/api/consultations/missed/run', async (req, res) => {
  try {
    await runMissedConsultationJob();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run missed job' });
  }
});

// --- Advisor Slots Cleanup Job ---
// Periodically deletes expired advisor availability slots (end_datetime <= NOW())
// so past-time slots are removed from the database without requiring a fetch-trigger.
const SLOTS_CLEANUP_POLL_MS = Number(process.env.SLOTS_CLEANUP_POLL_MS || 60_000); // 1 minute
let slotsCleanupRunning = false;

async function runAdvisorSlotsCleanupJob() {
  if (slotsCleanupRunning) return;
  slotsCleanupRunning = true;
  const pool = getPool();
  try {
    await pool.query(
      `DELETE FROM advisor_slots
       WHERE end_datetime <= NOW()`
    );
  } catch (err) {
    console.error('Advisor slots cleanup job error', err);
  } finally {
    slotsCleanupRunning = false;
  }
}

// Kick off periodic advisor slots cleanup job
setInterval(runAdvisorSlotsCleanupJob, SLOTS_CLEANUP_POLL_MS);

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started on port ${PORT}`);
  setImmediate(() => {
    if (autoMigrate) {
      autoMigrate().catch((err) => console.error('Auto-migrate startup error:', err));
    }
    const shouldSeedAdmin = String(process.env.SEED_ADMIN_ON_START || '').toLowerCase() === 'true';
    if (shouldSeedAdmin) {
      const pool = getPool();
      (async () => {
        try {
          const email = (process.env.ADMIN_EMAIL || 'admin@advisys.local').trim().toLowerCase();
          const fullName = (process.env.ADMIN_FULL_NAME || 'System Admin').trim();
          const plainPassword = String(process.env.ADMIN_PASSWORD || 'Admin!2025-ChangeMe');
          const [[existing]] = await pool.query('SELECT id, role FROM users WHERE email = ? LIMIT 1', [email]);
          const hash = await bcrypt.hash(plainPassword, 10);
          if (existing && existing.id) {
            await pool.query('UPDATE users SET role = ?, password_hash = ?, full_name = ?, status = ? WHERE id = ?', [
              'admin',
              hash,
              fullName,
              'active',
              existing.id,
            ]);
            console.log(`[admin] Updated existing user to admin: ${email}`);
          } else {
            const [resUser] = await pool.query(
              'INSERT INTO users (role, email, password_hash, full_name, status) VALUES (?,?,?,?,?)',
              ['admin', email, hash, fullName, 'active']
            );
            console.log(`[admin] Created admin user: ${email} (id=${resUser.insertId})`);
          }
          console.log(`[admin] Temporary password: ${plainPassword}`);
        } catch (e) {
          console.error('[admin] Seeding failed:', e?.message || e);
        }
      })();
    }
  });
});

