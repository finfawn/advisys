const express = require('express');
const router = express.Router();

// GET /api/ai/models
// Lists models available to the configured AI_SUMMARY_API_KEY using raw HTTP to v1 and v1beta endpoints
router.get('/ai/models', async (req, res) => {
  try {
    const key = process.env.AI_SUMMARY_API_KEY;
    if (!key) {
      return res.status(400).json({ ok: false, error: 'AI_SUMMARY_API_KEY is not set' });
    }
    const urls = [
      `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(key)}`,
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    ];
    const results = [];
    for (const url of urls) {
      try {
        const r = await fetch(url);
        const data = await r.json().catch(() => ({}));
        const models = (data?.models || [])
          .map((m) => ({
            name: m?.name,
            version: url.includes('/v1beta/') ? 'v1beta' : 'v1',
            supported_generation_methods: m?.supported_generation_methods || [],
          }));
        results.push({ endpoint: url, ok: r.ok, count: models.length, models, error: r.ok ? null : (data?.error || data) });
      } catch (e) {
        results.push({ endpoint: url, ok: false, count: 0, models: [], error: e?.message || String(e) });
      }
    }
    return res.json({ ok: true, endpoints: results });
  } catch (err) {
    const msg = err?.message || String(err);
    return res.status(500).json({ ok: false, error: msg });
  }
});

module.exports = router;