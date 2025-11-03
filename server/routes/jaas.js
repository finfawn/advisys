const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const {
  JAAS_APP_ID,
  JAAS_API_KEY_ID,
  JAAS_API_KEY_SECRET,
  JAAS_PRIVATE_KEY_PATH,
} = process.env;

if (!JAAS_APP_ID || !JAAS_API_KEY_ID || (!JAAS_API_KEY_SECRET && !JAAS_PRIVATE_KEY_PATH)) {
  console.warn('JaaS env vars missing: JAAS_APP_ID, JAAS_API_KEY_ID, and either JAAS_API_KEY_SECRET (HS256) or JAAS_PRIVATE_KEY_PATH (RS256)');
}

router.post('/token', (req, res) => {
  try {
    const { roomName, user } = req.body || {};
    if (!roomName) {
      return res.status(400).json({ error: 'roomName is required' });
    }

    const payload = {
      aud: 'jitsi',
      iss: 'chat',
      sub: JAAS_APP_ID,
      room: roomName,
      context: {
        user: {
          name: user?.name || 'User',
          email: user?.email || undefined,
        },
        features: {
          livestreaming: true,
          recording: true,
          transcription: true,
          'screen-sharing': true,
        },
      },
    };

    let token;
    if (JAAS_PRIVATE_KEY_PATH) {
      const fs = require('fs');
      const path = require('path');
      const privKey = fs.readFileSync(path.resolve(JAAS_PRIVATE_KEY_PATH), 'utf8');
      token = jwt.sign(payload, privKey, {
        algorithm: 'RS256',
        expiresIn: '1h',
        header: { kid: JAAS_API_KEY_ID },
      });
    } else if (JAAS_API_KEY_SECRET) {
      token = jwt.sign(payload, JAAS_API_KEY_SECRET, {
        algorithm: 'HS256',
        expiresIn: '1h',
        header: { kid: JAAS_API_KEY_ID },
      });
    } else {
      return res.status(500).json({ error: 'Missing JaaS signing credentials' });
    }

    return res.json({ token });
  } catch (err) {
    console.error('Failed to generate JaaS token', err);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
});

module.exports = router;