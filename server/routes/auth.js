const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

module.exports = function makeAuthRouter({ UserModel, jwtSecret, jwtExpiresIn, mailer }) {
  const router = express.Router();

  function isLikelyEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  router.post('/signup', async (req, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const emailRaw = String(body.email || '').trim();
      const email = emailRaw ? emailRaw.toLowerCase() : '';

      if (!username || !password) return res.status(400).json({ ok: false, error: 'username and password required' });

      if (email && !isLikelyEmail(email)) {
        return res.status(400).json({ ok: false, error: 'Invalid email format' });
      }

      const duplicateFilters = [{ username }];
      if (email) duplicateFilters.push({ email });

      const existing = await UserModel.findOne({ $or: duplicateFilters });
      if (existing) return res.status(400).json({ ok: false, error: 'User or email already exists' });

      const hash = await bcrypt.hash(password, 10);
      const userDoc = {
        username,
        passwordHash: hash,
      };
      if (email) userDoc.email = email;

      const u = new UserModel(userDoc);
      await u.save();
      const token = jwt.sign({ sub: u.username }, jwtSecret, { expiresIn: jwtExpiresIn });
      return res.json({ ok: true, user: { name: u.username }, token });
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({ ok: false, error: 'User or email already exists' });
      }
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const identifier = String(body.username || '').trim();
      const password = String(body.password || '');
      if (!identifier || !password) {
        return res.status(400).json({ ok: false, error: 'username/email and password required' });
      }
      const lookupEmail = identifier.toLowerCase();
      const u = await UserModel.findOne({
        $or: [{ username: identifier }, { email: lookupEmail }],
      });
      if (!u) return res.status(400).json({ ok: false, error: 'User not found' });
      const match = await bcrypt.compare(password, u.passwordHash);
      if (!match) return res.status(400).json({ ok: false, error: 'Invalid credentials' });
      const token = jwt.sign({ sub: u.username }, jwtSecret, { expiresIn: jwtExpiresIn });
      return res.json({ ok: true, user: { name: u.username }, token });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/forgot', async (req, res) => {
    try {
      const { email } = req.body;
      const u = await UserModel.findOne({ email });
      if (!u) return res.status(400).json({ ok: false, error: 'No account with that email' });
      const token = Math.random().toString(36).slice(2, 12);
      // store token in-memory/collection - for simplicity attach to user doc (not ideal for prod)
      u.resetToken = token;
      u.resetTokenCreatedAt = Date.now();
      await u.save();
      if (mailer) {
        await mailer.sendMail({ from: 'no-reply@filmfiesta.local', to: u.email, subject: 'Password reset', text: `Your FilmFiesta reset token: ${token}` });
      }
      return res.json({ ok: true, username: u.username, token });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/reset', async (req, res) => {
    try {
      const { username, token, newPassword } = req.body;
      const u = await UserModel.findOne({ username });
      if (!u || !u.resetToken) return res.status(400).json({ ok: false, error: 'No reset request' });
      if (u.resetToken !== token) return res.status(400).json({ ok: false, error: 'Invalid token' });
      u.passwordHash = await bcrypt.hash(newPassword, 10);
      u.resetToken = undefined;
      u.resetTokenCreatedAt = undefined;
      await u.save();
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/me', async (req, res) => {
    try {
      const h = req.headers.authorization;
      if (!h) return res.status(401).json({ ok: false, error: 'Unauthorized' });
      const parts = h.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ ok: false, error: 'Unauthorized' });
      const token = parts[1];
      const decoded = jwt.verify(token, jwtSecret);
      return res.json({ ok: true, user: { name: decoded.sub } });
    } catch (err) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }
  });

  return router;
};
