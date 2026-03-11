const express = require('express');

module.exports = function makeRatingsRouter({ Rating, User, authMiddleware }) {
  const router = express.Router();

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
      const { rating } = req.body;
      const username = req.user && req.user.name;
      if (!username) return res.status(401).json({ ok: false, error: 'Unauthorized' });
      if (!rating || Number.isNaN(Number(rating)) || rating < 1 || rating > 10) {
        return res.status(400).json({ ok: false, error: 'Rating must be 1-10' });
      }
      const user = await User.findOne({ username });
      if (!user) return res.status(400).json({ ok: false, error: 'User not found' });
      // ensure no existing rating
      const existing = await Rating.findOne({ user: user._id, movieId });
      if (existing) return res.status(409).json({ ok: false, error: 'You have already rated this movie' });
      const r = new Rating({ user: user._id, movieId: String(movieId), rating: Number(rating) });
      await r.save();
      return res.json({ ok: true, rating: { id: r._id, user: { username: user.username }, rating: r.rating, createdAt: r.createdAt } });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ ok: false, error: 'Duplicate rating' });
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
};
