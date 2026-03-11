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

  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
  app.use(limiter);

  // MongoDB / Mongoose setup
  const mongoose = require('mongoose');
  const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/filmfiesta';
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });

  const UserModel = require('./models/User');
  const Rating = require('./models/Rating');
  const Comment = require('./models/Comment');

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

  app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

  app.listen(PORT, () => console.log(`Auth server listening on http://localhost:${PORT}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
