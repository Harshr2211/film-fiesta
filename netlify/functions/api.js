const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const serverless = require('serverless-http');
const mongoose = require('mongoose');

const makeAuthRouter = require('../../server/routes/auth');
const makeRatingsRouter = require('../../server/routes/ratings');
const makeCommentsRouter = require('../../server/routes/comments');
const makeAuthMiddleware = require('../../server/middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/filmfiesta';

let cachedHandler;
let dbReady = false;
let mongoConnectPromise = null;

mongoose.set('bufferCommands', false);

function createAiRouter() {
  const router = express.Router();

  function stripTopP(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(stripTopP);
    for (const key of Object.keys(obj)) {
      if (key === 'top_p') delete obj[key];
      else obj[key] = stripTopP(obj[key]);
    }
    return obj;
  }

  router.post('/', async (req, res) => {
    try {
      const body = JSON.parse(JSON.stringify(req.body || {}));
      stripTopP(body);

      if (String(req.query.dry_run || '') === '1') {
        return res.json({ ok: true, dryRun: true, sanitized: body });
      }

      if (!body.model) body.model = process.env.DEFAULT_MODEL || 'gpt-5.4-mini';

      const MODEL_API_URL =
        process.env.MODEL_API_URL ||
        process.env.OPENAI_API_URL ||
        'https://api.openai.com/v1/chat/completions';
      const API_KEY = process.env.OPENAI_API_KEY || process.env.MODEL_API_KEY;

      if (!API_KEY) {
        return res.status(500).json({ ok: false, error: 'Model API key not configured on server.' });
      }

      const upstream = await fetch(MODEL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      const text = await upstream.text();
      try {
        const json = JSON.parse(text);
        return res.status(upstream.status).json(json);
      } catch (e) {
        return res.status(upstream.status).send(text);
      }
    } catch (err) {
      return res.status(500).json({ ok: false, error: String(err) });
    }
  });

  return router;
}

function createMailer() {
  try {
    const nodemailer = require('nodemailer');
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  } catch (e) {
    return null;
  }
}

function parseAllowedOrigins(raw) {
  if (!raw || raw === '*') return ['*'];
  return String(raw)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function makeCorsOptions() {
  const allowedOrigins = parseAllowedOrigins(CORS_ORIGIN);

  if (allowedOrigins.includes('*')) {
    return { origin: true };
  }

  return {
    origin(origin, callback) {
      // Allow non-browser requests (curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(
        new Error(
          `CORS blocked for origin: ${origin}. Add it to CORS_ORIGIN (comma-separated for multiple origins).`
        )
      );
    },
  };
}

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function connectMongoInBackground() {
  if (isDbConnected()) {
    dbReady = true;
    return Promise.resolve();
  }

  if (mongoConnectPromise) return mongoConnectPromise;

  mongoConnectPromise = mongoose
    .connect(MONGO, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      maxPoolSize: 5,
    })
    .then(() => {
      dbReady = true;
    })
    .catch((e) => {
      dbReady = false;
      console.warn('[netlify api] MongoDB unavailable, degraded mode:', e && e.message);
    })
    .finally(() => {
      mongoConnectPromise = null;
    });

  return mongoConnectPromise;
}

async function createHandler() {
  connectMongoInBackground();

  const app = express();
  app.use(helmet());
  app.use(express.json());
  app.use(cors(makeCorsOptions()));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'anonymous',
    })
  );

  const UserModel = require('../../server/models/User');
  const Rating = require('../../server/models/Rating');
  const Comment = require('../../server/models/Comment');

  const requireDb = (req, res, next) => {
    if (isDbConnected()) {
      dbReady = true;
      return next();
    }

    connectMongoInBackground();
    dbReady = false;
    return res.status(503).json({
      ok: false,
      error: 'Database unavailable. Check MONGO_URI and Atlas network access, then retry.',
      code: 'DB_UNAVAILABLE',
    });
  };

  const authRouter = makeAuthRouter({
    UserModel,
    jwtSecret: JWT_SECRET,
    jwtExpiresIn: JWT_EXPIRES_IN,
    mailer: createMailer(),
  });
  app.use('/auth', requireDb, authRouter);

  const authMiddleware = makeAuthMiddleware({ jwtSecret: JWT_SECRET });

  const ratingsRouter = makeRatingsRouter({ Rating, User: UserModel, authMiddleware });
  app.use('/ratings', requireDb, ratingsRouter);

  const commentsRouter = makeCommentsRouter({ Comment, User: UserModel, authMiddleware });
  app.use('/comments', requireDb, commentsRouter);

  app.use('/ai', createAiRouter());

  app.get('/health', (req, res) =>
    res.json({ ok: true, ts: Date.now(), dbReady: isDbConnected(), platform: 'netlify-functions' })
  );

  return serverless(app, {
    basePath: '/.netlify/functions/api',
  });
}

exports.handler = async (event, context) => {
  if (!cachedHandler) {
    cachedHandler = await createHandler();
  }
  return cachedHandler(event, context);
};
