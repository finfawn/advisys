const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const {
  JAAS_APP_ID,
  JAAS_API_KEY_ID,
  JAAS_API_KEY_SECRET,
} = process.env;

if (!JAAS_APP_ID || !JAAS_API_KEY_ID || !JAAS_API_KEY_SECRET) {
  console.warn('JaaS env vars missing: JAAS_APP_ID, JAAS_API_KEY_ID, JAAS_API_KEY_SECRET');
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

    const token = jwt.sign(payload, JAAS_API_KEY_SECRET, {
      algorithm: 'HS256',
      expiresIn: '1h',
      header: {
        kid: JAAS_API_KEY_ID,
      },
    });

    return res.json({ token });
  } catch (err) {
    console.error('Failed to generate JaaS token', err);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
});

module.exports = router;