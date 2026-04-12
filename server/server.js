require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

async function main() {
  const app = express();
  app.use(helmet());
  app.use(express.json());
  app.use(cors({ origin: CORS_ORIGIN }));

  // Defensive sanitize middleware: remove any unsupported model params like `top_p`
  // from incoming JSON bodies so they don't get forwarded accidentally.
  function stripTopP(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) obj[i] = stripTopP(obj[i]);
      return obj;
    }
    for (const k of Object.keys(obj)) {
      if (k === 'top_p') {
        delete obj[k];
        continue;
      }
      obj[k] = stripTopP(obj[k]);
    }
    return obj;
  }

  app.use((req, res, next) => {
    try {
      if (req.body) stripTopP(req.body);
    } catch (e) {
      // don't block request on sanitizer errors
      console.warn('Failed to sanitize request body', e && e.message);
    }
    next();
  });

  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
  app.use(limiter);

  // MongoDB / Mongoose setup
  const mongoose = require('mongoose');
  const MONGO = String(process.env.MONGO_URI || '').trim();
  const isProd = process.env.NODE_ENV === 'production';
  const LOCAL_MONGO_FALLBACK = 'mongodb://127.0.0.1:27017/filmfiesta';
  const mongoUri = MONGO || (!isProd ? LOCAL_MONGO_FALLBACK : '');
  const dbConfigured = Boolean(MONGO);
  let dbReady = false;
  if (!mongoUri) {
    console.error('[server] Missing MONGO_URI environment variable. Configure it in .env for local development.');
  } else {
    try {
      if (!MONGO && !isProd) {
        console.warn(`[server] MONGO_URI not set, using local fallback: ${LOCAL_MONGO_FALLBACK}`);
      }
      await mongoose.connect(mongoUri);
      dbReady = true;
    } catch (e) {
      dbReady = false;
      console.warn('[server] MongoDB unavailable, starting in degraded mode:', e && e.message);
    }
  }

  const UserModel = dbReady ? require('./models/User') : null;
  const Rating = dbReady ? require('./models/Rating') : null;
  const Comment = dbReady ? require('./models/Comment') : null;

  // nodemailer transporter - use env config
  let transporter = null;
  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  } catch (e) {
    console.warn('nodemailer not configured', e.message);
  }

  if (dbReady) {
    const makeAuthRouter = require('./routes/auth');
    const authRouter = makeAuthRouter({ UserModel, jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN, mailer: transporter });
    app.use('/api/auth', authRouter);

    const makeAuthMiddleware = require('./middleware/auth');
    const authMiddleware = makeAuthMiddleware({ jwtSecret: JWT_SECRET });

    const makeRatingsRouter = require('./routes/ratings');
    const ratingsRouter = makeRatingsRouter({ Rating, User: UserModel, authMiddleware });
    app.use('/api/ratings', ratingsRouter);

    const makeCommentsRouter = require('./routes/comments');
    const commentsRouter = makeCommentsRouter({ Comment, User: UserModel, authMiddleware });
    app.use('/api/comments', commentsRouter);
  } else {
    const degraded = (req, res) => {
      if (!dbConfigured && isProd) {
        return res.status(503).json({
          ok: false,
          error: 'Database is not configured. Set MONGO_URI in server/.env and restart.',
          code: 'DB_NOT_CONFIGURED',
        });
      }
      return res.status(503).json({
        ok: false,
        error: 'Database unavailable. Check MongoDB/Atlas connectivity and retry.',
        code: 'DB_UNAVAILABLE',
      });
    };
    app.use('/api/auth', degraded);
    app.use('/api/ratings', degraded);
    app.use('/api/comments', degraded);
  }

  // AI proxy route - strips unsupported params and forwards to model provider
  try {
    const makeAiRouter = require('./routes/ai');
    const aiRouter = makeAiRouter({});
    app.use('/api/ai', aiRouter);
  } catch (e) {
    console.warn('AI proxy route not loaded:', e && e.message);
  }

  app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now(), dbConfigured, dbReady }));

  // Temporary debug route to verify sanitization. Returns the JSON body back.
  // Remove or disable in production.
  app.post('/api/_sanity', (req, res) => {
    res.json({ received: req.body });
  });

  app.listen(PORT, () => console.log(`Auth server listening on http://localhost:${PORT}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
