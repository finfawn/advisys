const express = require('express');
const https = require('https');

const router = express.Router();

router.get('/email', async (req, res) => {
  const MAILJET_API_KEY = (process.env.MAILJET_API_KEY || '').trim();
  const MAILJET_API_SECRET = (process.env.MAILJET_API_SECRET || '').trim();
  const MAIL_FROM = (process.env.MAIL_FROM || '').trim();

  const envOk = Boolean(MAILJET_API_KEY && MAILJET_API_SECRET && MAIL_FROM);

  function checkHttps(hostname) {
    return new Promise((resolve) => {
      const req = https.request({ hostname, method: 'HEAD', path: '/', timeout: 8000 }, (r) => {
        resolve({ ok: true, statusCode: r.statusCode || 0 });
      });
      req.on('timeout', () => {
        req.destroy(new Error('timeout'));
      });
      req.on('error', (e) => {
        resolve({ ok: false, error: e.message || String(e) });
      });
      req.end();
    });
  }

  const net = await checkHttps('api.mailjet.com');
  return res.json({ envOk, net });
});

module.exports = router;