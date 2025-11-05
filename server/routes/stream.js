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
    const token = client.createUserToken(userId);

    // Optionally ensure the call exists server-side (useful for recording policies)
    let ensuredCallId = undefined;
    if (callId && typeof callId === 'string') {
      try {
        const callType = (type && typeof type === 'string') ? type : 'default';
        const call = client.video.call(callType, callId);
        await call.getOrCreate({});
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
    console.error('Stream token error:', err);
    return res.status(500).json({ error: 'Failed to mint Stream token' });
  }
});

module.exports = router;