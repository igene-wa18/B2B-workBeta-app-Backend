# WORKFORCE PRO — Server (API)

Backend API powering the WORKFORCE PRO B2B workforce management application.

This repository contains the Express + MongoDB server used by the client in this workspace. It implements authentication, role-based user management, departments, attendance tracking, leaves, expense claims (with receipt uploads), memos/announcements, notifications and useful aggregate stats.

---

## Table of Contents

- Project overview
- Quick start
- Environment variables
- Available scripts
- Running locally
- API overview (routes)
- Authentication
- File uploads
- Database models (summary)
- Seed data
- Email notifications
- Deployment notes
- Troubleshooting
- Contributing
- License

---

## Project overview

This server is a lightweight REST API built with:

- Node.js + Express
- MongoDB (via Mongoose)
- JSON Web Tokens (JWT) for auth
- Multer for file uploads
- Nodemailer for emails

It is intended to be run alongside the `client` app in this workspace. When a production `client/dist` build is present, the server will serve that static bundle.

Files and folders of interest:

- `server.js` — application entry, routes mounting, static serving
- `api/` — optional alternative entry used by some scripts
- `config/db.js` — MongoDB connection helper
- `middleware/` — auth and upload middleware
- `models/` — Mongoose schemas for main entities
- `routes/` — API route handlers (auth, users, departments, attendance, leaves, expenses, memos, notifications, stats)
- `uploads/` — persisted file uploads (receipts)
- `seed.js` — seeded demo dataset creator
- `utils/email.js` — helper for sending emails

---

## Quick start (development)

Prerequisites:

- Node.js (recommended v18+)
- npm
- A running MongoDB instance (Atlas or local)

1. Install server deps

```bash
cd server
npm install
```

2. Create a `.env` file in `server/` with the values below (example provided)

3. Start in development (uses `nodemon`):

```bash
npm run dev
```

4. (Optional) Seed the DB with demo data

```bash
npm run seed
```

You can also seed by calling the seeded HTTP route (useful when server is already running):

```bash
curl -X POST http://localhost:5000/api/seed
```

---

## Environment variables

Create a `.env` file in the `server` folder. Minimum required variables:

```text
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxx.mongodb.net/workforce?retryWrites=true&w=majority
PORT=5000
JWT_SECRET=change_this_to_a_long_random_string

# Optional email settings (used by utils/email.js)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false   # 'true' or 'false'
EMAIL_USER=your@email.com
EMAIL_PASS=your-email-password-or-app-password
```

Notes:

- `MONGO_URI` is required — the server will exit on DB connection failure.
- `JWT_SECRET` is required for token generation and verification.
- `EMAIL_USER` and `EMAIL_PASS` are required if you enable sending email.
- Keep these values secret in production (use your hosting platform's secret manager).

---

## Available scripts

Scripts are defined in `package.json`:

- `npm start` — `node server.js` (production)
- `npm run dev` — `nodemon server.js` (development)
- `npm run local-start` — `node server.js` (alias)
- `npm run api-start` — `node api/index.js` (alternate entry)
- `npm run seed` — runs `seed.js` to populate demo data
- `vercel-build` — used by deployment pipelines (runs `npm install`)

---

## Running locally (detailed)

Example `.env` (do NOT commit to git):

```text
MONGO_URI=mongodb://127.0.0.1:27017/workforce
PORT=5000
JWT_SECRET=supersecretjwtkey
EMAIL_USER=you@example.com
EMAIL_PASS=smtp-password
```

Then:

```bash
cd server
npm install
npm run dev
```

If you want the client served by the server in production mode:

```bash
# from repo root
cd client
npm install
npm run build

# then start the server (which serves client/dist automatically if present)
cd ../server
npm start
```

---

## API overview (high level)

Base API path: `/api`

Primary endpoints (see `routes/` files for details):

- `POST /api/auth/signup` — create account
- `POST /api/auth/login` — login, returns JWT
- `GET  /api/auth/me` — current user (requires `Authorization` header)

- `GET/POST/PUT/DELETE /api/users` — user management (role-scoped)
- `GET/POST/PUT/DELETE /api/departments` — departments and heads
- `GET/POST /api/attendance` — create and query attendance
- `GET/POST/PATCH /api/leaves` — request and manage leaves
- `GET/POST/PATCH /api/expenses` — submit/approve/reject expense claims
- `GET/POST/DELETE /api/memos` — company memos/announcements
- `GET/ /api/notifications` — per-user notifications
- `GET /api/stats` — aggregate statistics for reports

Examples:

Login request (JSON):

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hr@smartops.com","password":"Hr@123"}'
```

Protected request example (replace `<token>`):

```bash
curl http://localhost:5000/api/users \
  -H "Authorization: Bearer <token>"
```

Expense submission with file upload (multipart/form-data, field name `receipt`):

```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer <token>" \
  -F "amount=1200" -F "category=Travel" -F "description=Taxi fare" \
  -F "receipt=@/path/to/receipt.jpg"
```

---

## Authentication

- Uses JWT stored client-side. Include header: `Authorization: Bearer <token>`.
- Tokens are generated with `generateToken()` in `middleware/auth.js` and expire in ~30 days.
- `middleware/auth.js` provides `protect` middleware and `requireRole(...roles)` helper for role-based routes.

---

## File uploads

- File uploads are handled by `middleware/upload.js` (Multer).
- Upload directory: `server/uploads/` (created automatically).
- Uploaded files are served statically at `/uploads/<filename>`.
- Limit: 10 MB per file (configured in the middleware).
- Expense uploads use the `receipt` form field (see route `POST /api/expenses`).

Security note: uploaded files are not filtered by MIME type in the current implementation — consider adding file type validation or virus scanning before trusting or serving uploads in production.

---

## Database models (summary)

- `User` — name, email, hashed `password`, `role` (admin/manager/employee/etc.), `department_id`, `manager_id`, `isActive`
- `Department` — name, `head_id`, `createdBy`
- `Attendance` — `user_id`, `date`, `check_in`, `check_out`, `status`, `hours_worked`
- `Leave` — `user_id`, `start_date`, `end_date`, `reason`, `status`, `approved_by`, `response_note`
- `Expense` — `manager_id`, `amount`, `category`, `description`, `receipt_url`, `status`, `approved_by`
- `Memo` — `title`, `content`, `created_by`
- `Notification` — `user_id`, `title`, `message`, `type`, `link`, `isRead`

Refer to the `models/` folder for full schema definitions and Mongoose indexes.

---

## Seed data

`seed.js` creates:

- 2 HR/Admin users
- 3 departments with heads
- 3 managers and a set of demo employees
- ~45 days of attendance records (skipping weekends)
- Random leaves, expenses and memos

Run `npm run seed` to execute the script from the `server` folder. The script will clear the existing collections it touches — do not run against production data.

---

## Email notifications

- The helper `utils/email.js` sends emails using environment SMTP credentials. Provide `EMAIL_USER`/`EMAIL_PASS` and optional `EMAIL_HOST`/`EMAIL_PORT`/`EMAIL_SECURE`.
- IMPORTANT: the current helper calls `nodemailer.createTransporter(...)`. Nodemailer’s actual API is `createTransport(...)`. If you encounter `createTransporter is not a function` errors when sending email, update the helper to use `nodemailer.createTransport(...)`.

---

## Deployment notes

- Ensure environment variables are set in your hosting platform (MONGO_URI, JWT_SECRET, EMAIL_*).
- Build the `client` and place its `dist` into the repo (server serves `../client/dist` automatically).
- Start with `npm start` in `server/` for production.

Suggested hosting targets: Render, Heroku (with Procfile), DigitalOcean App Platform, or a containerized environment. When deploying behind a reverse proxy, ensure the `PORT` env var is available.

If you use Vercel for full-stack hosting, the `vercel-build` script exists but most people deploy the server separately (Vercel is optimized for frontend and Serverless functions).

---

## Troubleshooting

- MongoDB connection errors: confirm `MONGO_URI` is correct and your IP/access rules allow connections.
- Auth errors: ensure `JWT_SECRET` matches between token generation and verification.
- Upload errors: ensure `uploads/` is writable by the server process and disk space is sufficient.
- Email errors: verify SMTP credentials and ports; check `utils/email.js` API call noted above.

Logs: the server prints connection status and helpful messages on startup.

---

## Contributing

If you want to improve or harden the server:

- Add validation (e.g., `express-validator`) to route payloads
- Add unit and integration tests (Jest / supertest)
- Add file type checks and virus scanning for uploads
- Add rate-limiting and CORS tightening for production
- Improve email helper error handling and retries

Please open issues or PRs against the repo and follow the same coding style used across the project.

---

## License & acknowledgements

This project is delivered as part of the WORKFORCE PRO example app. Replace this section with your chosen license.

---

If you want, I can also:

- add a `.env.example` file in `server/` with the keys above
- add a short `CONTRIBUTING.md` with PR checklist
- scan `utils/` for small bugs and open PR suggestions

---

File: [server/README.md](server/README.md)
