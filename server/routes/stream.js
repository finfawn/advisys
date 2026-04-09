const express = require('express');
const router = express.Router();
const { getPool } = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

// Stream Video: server-side client
let StreamClient;
try {
  ({ StreamClient } = require('@stream-io/node-sdk'));
} catch (_) {
  StreamClient = null;
}

const {
  STREAM_API_KEY = '',
  STREAM_API_SECRET = '',
} = process.env;

const CONSULTATION_CALL_TYPE = 'consultation';
const DEFAULT_CALL_TYPE = 'default';
const CALL_MEMBER_ROLE = 'call-member';
const REQUIRED_CALL_MEMBER_CAPABILITIES = [
  'join-call',
  'read-call',
  'send-audio',
  'send-video',
  'screenshare',
];

let consultationCallTypePromise = null;

function getStreamClient() {
  if (!StreamClient) {
    throw new Error('Stream SDK not installed on server');
  }
  if (!STREAM_API_KEY || !STREAM_API_SECRET) {
    throw new Error('Missing STREAM_API_KEY/STREAM_API_SECRET in environment');
  }
  return new StreamClient(STREAM_API_KEY, STREAM_API_SECRET);
}

function unique(values = []) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));
}

function normalizeGrants(grants = {}) {
  return Object.keys(grants || {})
    .sort()
    .reduce((acc, role) => {
      acc[role] = unique(grants[role]).sort();
      return acc;
    }, {});
}

function grantsEqual(left = {}, right = {}) {
  return JSON.stringify(normalizeGrants(left)) === JSON.stringify(normalizeGrants(right));
}

function buildConsultationGrants(sourceGrants = {}) {
  const nextGrants = { ...(sourceGrants || {}) };
  nextGrants.user = unique((nextGrants.user || []).filter((capability) => capability !== 'join-call'));
  nextGrants[CALL_MEMBER_ROLE] = unique([
    ...(nextGrants[CALL_MEMBER_ROLE] || []),
    ...REQUIRED_CALL_MEMBER_CAPABILITIES,
  ]);
  return nextGrants;
}

function isNotFoundError(error) {
  const status = Number(error?.status || error?.statusCode || error?.response?.status || 0);
  const message = String(error?.message || '').toLowerCase();
  return status === 404 || message.includes('404') || message.includes('not found');
}

async function ensureConsultationCallType(client) {
  if (consultationCallTypePromise) {
    return consultationCallTypePromise;
  }

  consultationCallTypePromise = (async () => {
    try {
      try {
        const existing = await client.video.getCallType({ name: CONSULTATION_CALL_TYPE });
        const nextGrants = buildConsultationGrants(existing?.grants || {});
        if (!grantsEqual(existing?.grants || {}, nextGrants)) {
          await client.video.updateCallType({
            name: CONSULTATION_CALL_TYPE,
            grants: nextGrants,
          });
        }
        return CONSULTATION_CALL_TYPE;
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }

      const baseCallType = await client.video.getCallType({ name: DEFAULT_CALL_TYPE });
      const payload = {
        name: CONSULTATION_CALL_TYPE,
        grants: buildConsultationGrants(baseCallType?.grants || {}),
        settings: baseCallType?.settings,
        notification_settings: baseCallType?.notification_settings,
      };

      if (baseCallType?.external_storage) {
        payload.external_storage = baseCallType.external_storage;
      }

      await client.video.createCallType(payload);
      return CONSULTATION_CALL_TYPE;
    } catch (error) {
      consultationCallTypePromise = null;
      throw error;
    }
  })();

  return consultationCallTypePromise;
}

async function getAuthorizedConsultation(pool, consultationId, user) {
  const [[consultation]] = await pool.query(
    `SELECT c.id,
            c.topic,
            c.category,
            c.mode,
            c.status,
            c.student_user_id,
            c.advisor_user_id,
            su.full_name AS student_name,
            au.full_name AS advisor_name
       FROM consultations c
       JOIN users su ON su.id = c.student_user_id
       JOIN users au ON au.id = c.advisor_user_id
      WHERE c.id = ?
      LIMIT 1`,
    [consultationId]
  );

  if (!consultation) {
    return { error: 'Consultation not found', status: 404 };
  }

  const currentUserId = Number(user?.id || 0);
  const isAdvisor = String(user?.role || '').toLowerCase() === 'advisor' && currentUserId === Number(consultation.advisor_user_id);
  const isStudent = String(user?.role || '').toLowerCase() === 'student' && currentUserId === Number(consultation.student_user_id);

  if (!isAdvisor && !isStudent) {
    return { error: 'Only the assigned advisor or student can join this consultation room', status: 403 };
  }

  if (String(consultation.mode || '').toLowerCase() !== 'online') {
    return { error: 'This consultation does not use an online meeting room', status: 409 };
  }

  if (String(consultation.status || '').toLowerCase() !== 'approved') {
    return { error: 'This consultation room is only available for approved online consultations', status: 409 };
  }

  return { consultation, isAdvisor };
}

// GET /api/stream/debug
// Returns presence of env vars and basic client construction status
router.get('/debug', (req, res) => {
  const hasKey = Boolean(STREAM_API_KEY && STREAM_API_KEY.trim());
  const hasSecret = Boolean(STREAM_API_SECRET && STREAM_API_SECRET.trim());
  try {
    const client = getStreamClient();
    return res.json({ ok: true, hasApiKey: hasKey, hasApiSecret: hasSecret, clientReady: !!client });
  } catch (e) {
    return res.status(500).json({ ok: false, hasApiKey: hasKey, hasApiSecret: hasSecret, error: e?.message || String(e) });
  }
});

// POST /api/stream/token
// Body: { consultationId: number, callId?: string }
// Returns: { token, apiKey, user: { id, name }, callId, callType }
router.post('/token', authMiddleware, async (req, res) => {
  try {
    const { consultationId } = req.body || {};
    const parsedConsultationId = Number(consultationId);
    if (!parsedConsultationId) {
      return res.status(400).json({ error: 'Missing or invalid consultationId' });
    }

    const pool = getPool();
    const authUser = req.user || {};
    const authCheck = await getAuthorizedConsultation(pool, parsedConsultationId, authUser);
    if (authCheck.error) {
      return res.status(authCheck.status).json({ error: authCheck.error });
    }

    const { consultation, isAdvisor } = authCheck;
    const userId = String(authUser.id);
    const fullName = String(
      authUser.full_name ||
      (isAdvisor ? consultation.advisor_name : consultation.student_name) ||
      authUser.email ||
      userId
    ).trim();
    const ensuredCallId = `advisys-${parsedConsultationId}`;

    const client = getStreamClient();
    const callType = await ensureConsultationCallType(client);

    const memberUsers = [
      { id: String(consultation.student_user_id), name: consultation.student_name || `Student ${consultation.student_user_id}` },
      { id: String(consultation.advisor_user_id), name: consultation.advisor_name || `Advisor ${consultation.advisor_user_id}` },
    ];

    // Ensure the user exists in Stream (upsert is idempotent)
    try {
      await client.upsertUsers(memberUsers);
    } catch (e) {
      console.warn('[Stream] upsertUsers failed:', e?.message || e);
    }

    const token = client.createToken(userId);

    const call = client.video.call(callType, ensuredCallId);
    await call.getOrCreate({
      data: {
        created_by_id: userId,
        members: [
          { user_id: String(consultation.student_user_id), role: CALL_MEMBER_ROLE },
          { user_id: String(consultation.advisor_user_id), role: CALL_MEMBER_ROLE },
        ],
        custom: {
          consultation_id: parsedConsultationId,
          topic: consultation.topic || null,
          category: consultation.category || null,
        },
      },
    });

    return res.json({
      token,
      apiKey: STREAM_API_KEY,
      user: { id: userId, name: fullName },
      callId: ensuredCallId,
      callType,
    });
  } catch (err) {
    const hasKey = Boolean(STREAM_API_KEY && STREAM_API_KEY.trim());
    const hasSecret = Boolean(STREAM_API_SECRET && STREAM_API_SECRET.trim());
    const msg = err?.message || String(err);
    console.error('[Stream] token error:', msg, {
      hasApiKey: hasKey,
      hasApiSecret: hasSecret,
      route: '/api/stream/token',
      userId: req?.user?.id,
      consultationId: req?.body?.consultationId,
    });
    if (err?.stack) console.error(err.stack);
    return res.status(500).json({ error: 'Failed to mint Stream token' });
  }
});

module.exports = router;
