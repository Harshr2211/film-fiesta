const jwt = require('jsonwebtoken');

module.exports = function makeAuthMiddleware({ jwtSecret }) {
  return function authMiddleware(req, res, next) {
    const h = req.headers.authorization;
    if (!h) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const parts = h.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const token = parts[1];
    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = { name: decoded.sub, id: decoded.subId || decoded.id };
      next();
    } catch (err) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }
  };
};
