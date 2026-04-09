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

async function connectMongo() {
  if (mongoose.connection.readyState === 1) {
    dbReady = true;
    return;
  }

  try {
    await mongoose.connect(MONGO);
    dbReady = true;
  } catch (e) {
    dbReady = false;
    console.warn('[netlify api] MongoDB unavailable, degraded mode:', e && e.message);
  }
}

async function createHandler() {
  await connectMongo();

  const app = express();
  app.use(helmet());
  app.use(express.json());
  app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'anonymous',
    })
  );

  if (dbReady) {
    const UserModel = require('../../server/models/User');
    const Rating = require('../../server/models/Rating');
    const Comment = require('../../server/models/Comment');

    const authRouter = makeAuthRouter({
      UserModel,
      jwtSecret: JWT_SECRET,
      jwtExpiresIn: JWT_EXPIRES_IN,
      mailer: createMailer(),
    });
    app.use('/auth', authRouter);

    const authMiddleware = makeAuthMiddleware({ jwtSecret: JWT_SECRET });

    const ratingsRouter = makeRatingsRouter({ Rating, User: UserModel, authMiddleware });
    app.use('/ratings', ratingsRouter);

    const commentsRouter = makeCommentsRouter({ Comment, User: UserModel, authMiddleware });
    app.use('/comments', commentsRouter);
  } else {
    const degraded = (req, res) =>
      res.status(503).json({ ok: false, error: 'Database unavailable. Configure MONGO_URI to enable auth/ratings/comments.' });
    app.use('/auth', degraded);
    app.use('/ratings', degraded);
    app.use('/comments', degraded);
  }

  try {
    const makeAiRouter = require('../../server/routes/ai');
    const aiRouter = makeAiRouter({});
    app.use('/ai', aiRouter);
  } catch (e) {
    console.warn('[netlify api] AI route unavailable:', e && e.message);
  }

  app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now(), dbReady, platform: 'netlify-functions' }));

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
