const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const {
  JAAS_APP_ID,
  JAAS_API_KEY_ID,
  JAAS_PRIVATE_KEY_PATH,
} = process.env;

// Sanitize env values to avoid hidden whitespace issues
const APP_ID = (JAAS_APP_ID || '').trim();
const KID = (JAAS_API_KEY_ID || '').trim();
const KEY_PATH = (JAAS_PRIVATE_KEY_PATH || '').trim();

let privateKeyCache = null;
function getPrivateKey() {
  if (privateKeyCache) return privateKeyCache;
  if (!KEY_PATH) {
    throw new Error('JAAS_PRIVATE_KEY_PATH is not set in .env');
  }
  const fullPath = path.resolve(KEY_PATH);
  try {
    privateKeyCache = fs.readFileSync(fullPath, 'utf8');
  } catch (e) {
    console.error('[JaaS JWT] Failed to read private key at path:', fullPath, e?.message);
    throw e;
  }
  return privateKeyCache;
}

if (!APP_ID || !KID || !KEY_PATH) {
  console.warn('JaaS RS256 env vars missing: JAAS_APP_ID, JAAS_API_KEY_ID, JAAS_PRIVATE_KEY_PATH');
}

// POST /generate-jwt
router.post('/', (req, res) => {
  try {
    const { roomName, user } = req.body || {};
    if (!roomName) {
      return res.status(400).json({ error: 'roomName is required' });
    }
    if (!APP_ID || !KID) {
      return res.status(500).json({ error: 'JaaS configuration missing' });
    }

    const payload = {
      aud: 'jitsi',
      iss: 'chat',
      sub: APP_ID,
      room: roomName,
      context: {
        user: {
          name: user?.name || 'User',
          email: user?.email || undefined,
          // Grant moderator only for advisors (server trusts explicit role)
          moderator: (user?.role || '').toLowerCase() === 'advisor',
        },
        features: {
          livestreaming: true,
          recording: true,
          transcription: false,
          'screen-sharing': true,
        },
      },
    };

    // Debug logging (safe metadata only)
    if (process.env.NODE_ENV !== 'production') {
      const resolvedPath = path.resolve(KEY_PATH || '');
      console.log('[JaaS JWT] Generating token', {
        kid: KID,
        sub: APP_ID,
        room: roomName,
        keyPath: resolvedPath,
        expIn: '1h',
      });
    }

    const token = jwt.sign(payload, getPrivateKey(), {
      algorithm: 'RS256',
      expiresIn: '1h',
      header: {
        kid: KID,
      },
    });

    return res.json({ token });
  } catch (err) {
    console.error('Failed to generate RS256 JaaS token:', err?.message || err);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
});

module.exports = router;