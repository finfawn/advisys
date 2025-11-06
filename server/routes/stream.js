const express = require('express');
const router = express.Router();

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

function getStreamClient() {
  if (!StreamClient) {
    throw new Error('Stream SDK not installed on server');
  }
  if (!STREAM_API_KEY || !STREAM_API_SECRET) {
    throw new Error('Missing STREAM_API_KEY/STREAM_API_SECRET in environment');
  }
  return new StreamClient(STREAM_API_KEY, STREAM_API_SECRET);
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
// Body: { userId: string, name?: string, callId?: string, type?: string }
// Returns: { token, apiKey, user: { id, name }, callId? }
router.post('/token', async (req, res) => {
  try {
    const { userId, name, callId, type } = req.body || {};
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid userId' });
    }

    const client = getStreamClient();

    // Ensure the user exists in Stream (upsert is idempotent)
    try {
      await client.upsertUsers([{ id: userId, name: name || userId }]);
    } catch (e) {
      // Continue even if upsert fails; token may still be usable
      console.warn('[Stream] upsertUsers failed:', e?.message || e);
    }

    // Create a user token for the frontend SDK
    const token = client.createToken(userId);

    // Optionally ensure the call exists server-side (useful for recording policies)
    let ensuredCallId = undefined;
    if (callId && typeof callId === 'string') {
      try {
        const callType = (type && typeof type === 'string') ? type : 'default';
        const call = client.video.call(callType, callId);
        // Provide creator metadata under data{} for server-side auth compliance
        await call.getOrCreate({ data: { created_by_id: userId } });
        ensuredCallId = callId;
      } catch (e) {
        console.warn('[Stream] getOrCreate call failed:', e?.message || e);
      }
    }

    return res.json({
      token,
      apiKey: STREAM_API_KEY,
      user: { id: userId, name: name || userId },
      callId: ensuredCallId,
    });
  } catch (err) {
    const hasKey = Boolean(STREAM_API_KEY && STREAM_API_KEY.trim());
    const hasSecret = Boolean(STREAM_API_SECRET && STREAM_API_SECRET.trim());
    const msg = err?.message || String(err);
    console.error('[Stream] token error:', msg, {
      hasApiKey: hasKey,
      hasApiSecret: hasSecret,
      route: '/api/stream/token',
      userId: req?.body?.userId,
    });
    if (err?.stack) console.error(err.stack);
    return res.status(500).json({ error: 'Failed to mint Stream token' });
  }
});

module.exports = router;