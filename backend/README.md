# Platoons X — Admin Panel & Backend

An **additive** admin panel + database-backed API bolted onto the existing static
Platoons X website. The public site keeps working exactly as before; whenever the
API is reachable, marketing sections become editable from the admin panel.

- **Stack:** Node/Express + MySQL (`mysql2/promise`), JWT auth (bcrypt), multer uploads
- **Admin UI:** single file `admin-panel.html` (served at `/admin`), styled with the site's own design tokens
- **Public site:** unchanged HTML/CSS/JS; `public-data.js` swaps in DB content when available, falls back to the static markup otherwise

---

## Run locally

```bash
# 1. install (already done if node_modules exists)
npm install

# 2. configure
cp .env.example .env        # then edit .env — set DB creds, JWT_SECRET, ADMIN_*
#   generate a JWT secret:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. create the schema and seed current content
npm run db:init
npm run db:seed

# 4. start
npm start                   # → http://localhost:3000
#   public site : http://localhost:3000/
#   admin panel : http://localhost:3000/admin
#   health      : http://localhost:3000/api/health
```

First boot seeds a default admin from `ADMIN_USERNAME` / `ADMIN_PASSWORD` (only if no
admin exists yet). Log in at `/admin` with those credentials.

### Verify the full stack
```bash
node backend/smoke-test.js   # login → CRUD → upload → public read (needs .env + MySQL)
npm test                     # existing front-end Jest suite (unchanged)
```

---

## Environment variables

See [`.env.example`](../.env.example). Key ones:

| Var | Purpose |
|---|---|
| `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` | MySQL connection (discrete) |
| `DATABASE_URL` | …or a single connection string (overrides the discrete vars) |
| `JWT_SECRET` | signs admin JWTs — set a long random value |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_EMAIL` | seeded default admin |
| `FRONTEND_URL` | comma-separated allowed CORS origins in prod (blank = allow all, dev) |
| `PORT` | server port (default 3000) |
| `GOOGLE_SCRIPT_URL` | existing Apps Script web app — leads are mirrored here |
| `MAX_UPLOAD_MB` | upload size cap (default 5) |
| `CLOUDINARY_*` | optional; if set, future cloud uploads instead of DB blob |

---

## API surface

```
GET    /api/health                          always-on health check
POST   /api/auth/login                      { username, password } → { token }
POST   /api/auth/register-admin             first-run only
GET    /api/auth/verify          🔒          token check
GET    /api/dashboard            🔒          counts for the admin home

# content resources — GET public, POST/PUT/DELETE 🔒
/api/services        /api/team          /api/testimonials   /api/faqs
/api/process-steps   /api/ai-features   /api/stats          /api/pillars
/api/pricing  (plans + nested features)
/api/settings (GET public, PUT 🔒)

# blog
GET  /api/blog                 public list (published + due-scheduled)
GET  /api/blog/:slug           public single
GET  /api/blog/id/:id   🔒       admin fetch (drafts)
POST/PUT/DELETE         🔒

# leads
POST /api/leads                PUBLIC — saves to DB + mirrors to Google Sheets
GET  /api/leads         🔒       inbox
PUT  /api/leads/:id     🔒       status / notes

# media
POST   /api/media       🔒       multipart "file" → DB blob (mime+size validated)
GET    /api/media       🔒       list
GET    /api/media/:id          PUBLIC — serves the image bytes
DELETE /api/media/:id   🔒
```

🔒 = requires `Authorization: Bearer <token>`.

---

## Deploy to Hostinger (Node + MySQL)

1. **Create a MySQL database** in hPanel → *Databases → MySQL*. Note host, db name, user, password.
2. **Upload** the project (git or file manager). Ensure `node_modules` is installed (`npm install` via SSH, or Hostinger's Node setup).
3. **Set environment variables** in hPanel → *Advanced → Node.js app* (or a `.env` file on a VPS). Use the MySQL details from step 1, a strong `JWT_SECRET`, and your `ADMIN_*` credentials. Set `FRONTEND_URL` to your domain(s).
4. **Initialize the DB** once over SSH: `npm run db:init && npm run db:seed`.
5. **Start command:** `npm start` (runs `backend/server.js`). On a VPS, use `pm2 start backend/server.js --name platoons`.
6. Visit `/admin`, log in, and you're live. The public site renders DB content automatically; if the DB is ever down, it falls back to the original static markup.

> The legacy lead server is still available via `npm run start:legacy` (`server.js`) if you ever need just the old Google-Sheets proxy.

---

## What's dynamic vs. static

**DB-driven on the public site** (editable in admin, with static fallback):
Services · Team · Testimonials · FAQs · AI Features · Why-Us Pillars · Leads · Settings.

**Editable in admin, DB-backed, but rendered from static markup on the public page for now:**
Pricing and Process Steps. Both are tied to bespoke animations (the digit-roller and the
orbital timeline). Their tables, API, and admin CRUD are fully functional — re-rendering
them live is deferred so those animations aren't disturbed. The Blog is fully built
(editor, scheduling, media) and ready for a public blog page/listing when desired.

---

## Security notes

- Passwords hashed with bcrypt (cost 12); never logged.
- All write/admin endpoints require a valid JWT (`verifyToken`).
- 100% parameterized queries; writable columns are whitelisted (no mass-assignment).
- Secrets come from env; `.env` is git-ignored. No default credential is shipped.
- CORS restricted to `FRONTEND_URL` in production.
- Uploads validated by MIME type and size.
- Errors return safe messages; stack traces stay in server logs.
