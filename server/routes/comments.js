const express = require('express');

module.exports = function makeCommentsRouter({ Comment, User, authMiddleware }) {
  const router = express.Router();

  async function resolveUserFromRequest(req) {
    const userId = req.user && req.user.id ? String(req.user.id) : '';
    const username = req.user && req.user.name ? String(req.user.name).trim() : '';

    if (userId) {
      const byId = await User.findById(userId);
      if (byId) return byId;
    }

    if (username) {
      return User.findOne({ username });
    }

    return null;
  }

  router.get('/:movieId', async (req, res) => {
    try {
      const { movieId } = req.params;
      const items = await Comment.find({ movieId }).populate('user', 'username').sort({ createdAt: -1 }).lean();
      const mapped = items.map((c) => ({ id: c._id, text: c.text, createdAt: c.createdAt, user: { username: c.user ? c.user.username : 'Unknown' } }));
      return res.json({ ok: true, data: mapped });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/:movieId', authMiddleware, async (req, res) => {
    try {
      const { movieId } = req.params;
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const text = body.text;

      if (!movieId || String(movieId).trim().length === 0) {
        return res.status(400).json({ ok: false, error: 'movieId is required' });
      }
      if (!text || String(text).trim().length === 0) return res.status(400).json({ ok: false, error: 'Comment text required' });
      if (String(text).length > 2000) return res.status(400).json({ ok: false, error: 'Comment too long' });

      const user = await resolveUserFromRequest(req);
      if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized user' });

      const c = new Comment({ user: user._id, movieId: String(movieId), text: String(text).trim() });
      await c.save();
      return res.json({ ok: true, comment: { id: c._id, text: c.text, createdAt: c.createdAt, user: { username: user.username } } });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
};
