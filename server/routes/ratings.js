const express = require('express');

module.exports = function makeRatingsRouter({ Rating, User, authMiddleware }) {
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

  // Get ratings summary for a movie
  router.get('/:movieId', async (req, res) => {
    try {
      const { movieId } = req.params;
      const docs = await Rating.find({ movieId }).populate('user', 'username').lean();
      const count = docs.length;
      const avg = count ? docs.reduce((s, d) => s + Number(d.rating), 0) / count : 0;
      let you = null;
      if (req.headers.authorization) {
        try {
          // try to get user from token using authMiddleware style
        } catch (e) {}
      }
      // if Authorization header present validate the token to get username
      // but rather rely on authMiddleware to attach req.user for protected endpoints
      return res.json({ ok: true, data: { average: Math.round(avg * 10) / 10, count, ratings: docs } });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // protected: add rating
  router.post('/:movieId', authMiddleware, async (req, res) => {
    try {
      const { movieId } = req.params;
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const rawRating = body.rating;

      if (!movieId || String(movieId).trim().length === 0) {
        return res.status(400).json({ ok: false, error: 'movieId is required' });
      }

      const numericRating = Number(rawRating);
      if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 10) {
        return res.status(400).json({ ok: false, error: 'Rating must be 1-10' });
      }

      const user = await resolveUserFromRequest(req);
      if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized user' });

      // if user already rated, update instead of throwing conflict
      const existing = await Rating.findOne({ user: user._id, movieId });
      let r;
      if (existing) {
        existing.rating = numericRating;
        await existing.save();
        r = existing;
      } else {
        r = new Rating({ user: user._id, movieId: String(movieId), rating: numericRating });
        await r.save();
      }

      return res.json({ ok: true, rating: { id: r._id, user: { username: user.username }, rating: r.rating, createdAt: r.createdAt } });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ ok: false, error: 'Duplicate rating' });
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
};
