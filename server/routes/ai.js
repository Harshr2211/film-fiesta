const express = require('express');

// Simple proxy route that forwards chat requests to the model provider
// while removing unsupported parameters like `top_p` and enforcing the
// model to `gpt-5.4-mini` (when available).
module.exports = function makeAiRouter({}) {
  const router = express.Router();

  // Recursively strip top_p
  function stripTopP(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(stripTopP);
    for (const k of Object.keys(obj)) {
      if (k === 'top_p') delete obj[k];
      else obj[k] = stripTopP(obj[k]);
    }
    return obj;
  }

  router.post('/', async (req, res) => {
    try {
      const body = JSON.parse(JSON.stringify(req.body || {}));
      stripTopP(body);

      // Optional dry-run for local debugging/verification
      if (String(req.query.dry_run || '') === '1') {
        return res.json({ ok: true, dryRun: true, sanitized: body });
      }

      // Enforce model to gpt-5.4-mini unless caller overrides (caller can still set model)
      if (!body.model) body.model = process.env.DEFAULT_MODEL || 'gpt-5.4-mini';

      const MODEL_API_URL = process.env.MODEL_API_URL || process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
      const API_KEY = process.env.OPENAI_API_KEY || process.env.MODEL_API_KEY;
      if (!API_KEY) return res.status(500).json({ ok: false, error: 'Model API key not configured on server.' });

      const fetchOpts = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(body),
      };

      const r = await fetch(MODEL_API_URL, fetchOpts);
      const text = await r.text();
      // Try parse JSON, otherwise return raw text
      try {
        const json = JSON.parse(text);
        return res.status(r.status).json(json);
      } catch (e) {
        return res.status(r.status).send(text);
      }
    } catch (err) {
      console.error('AI proxy error:', err);
      return res.status(500).json({ ok: false, error: String(err) });
    }
  });

  return router;
};
