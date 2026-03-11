const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

module.exports = function makeAuthRouter({ UserModel, jwtSecret, jwtExpiresIn, mailer }) {
  const router = express.Router();

  router.post('/signup', async (req, res) => {
    try {
      const { username, password, email } = req.body;
      if (!username || !password) return res.status(400).json({ ok: false, error: 'username and password required' });
      const existing = await UserModel.findOne({ $or: [{ username }, { email }] });
      if (existing) return res.status(400).json({ ok: false, error: 'User or email already exists' });
      const hash = await bcrypt.hash(password, 10);
      const u = new UserModel({ username, email: email || null, passwordHash: hash });
      await u.save();
      const token = jwt.sign({ sub: u.username }, jwtSecret, { expiresIn: jwtExpiresIn });
      return res.json({ ok: true, user: { name: u.username }, token });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const u = await UserModel.findOne({ username });
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
