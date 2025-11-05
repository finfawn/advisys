const express = require('express');

const router = express.Router();

// Settings Provisioning: respond with meeting settings per JaaS docs
// POST payload: { fqn: "<APP_ID>/<roomName>" }
// Minimal response focused on transcription only: { transcriberType }

router.post('/', (req, res) => {
  try {
    const { fqn } = req.body || {};
    if (!fqn || typeof fqn !== 'string') {
      return res.status(400).json({ error: 'Missing fqn (format: APP_ID/roomName)' });
    }

    const { JAAS_SETTINGS_TRANSCRIBER_TYPE } = process.env;

    // Keep the provisioning minimal: only return transcriberType.
    // If not set, omit the key so JaaS falls back to the Admin Panel selection.
    const response = {
      transcriberType: JAAS_SETTINGS_TRANSCRIBER_TYPE || undefined,
    };

    // Remove undefined keys to keep response clean
    Object.keys(response).forEach((k) => {
      if (response[k] === undefined) delete response[k];
    });

    return res.json(response);
  } catch (err) {
    console.error('[JaaS Settings] Error responding to provisioning request:', err?.message || err);
    return res.status(500).json({ error: 'Failed to provision settings' });
  }
});

module.exports = router;