FilmFiesta Auth Server

This is a small Express-based authentication server used for local development.
It provides endpoints under /api/auth for signup, login, forgot and reset.

Features:
- bcrypt password hashing
- JWT tokens (store in client localStorage as `ff_token`)
- lowdb JSON file persistence (db.json)
- nodemailer integration (use Ethereal for dev or configure SMTP)
- simple protections: helmet, CORS, rate-limiting

Getting started
1. Copy .env.example to .env and edit values (JWT_SECRET, SMTP credentials if you want emails).
2. Install dependencies:

   cd server
   npm install

3. Start server in dev mode:

   npm run dev

4. Configure front-end to use the server by setting REACT_APP_API_URL in the front-end .env, for example:

   REACT_APP_API_URL=http://localhost:4000

Notes
- For sending real emails in dev you can create an Ethereal account (https://ethereal.email/) and use the credentials.
- This server is intended for local development and prototyping. For production you should:
  - Use a real database
  - Use HTTPS and secure JWT handling
  - Use a real email provider for password resets
  - Place the server behind a cloud firewall (Cloudflare, AWS WAF, etc.) and use rate-limiting and monitoring
