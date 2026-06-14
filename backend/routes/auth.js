// ─── Platoons X — Auth routes ────────────────────────────────────────────────
//   POST /api/auth/login            { username, password } -> { token, user }
//   POST /api/auth/register-admin   first-run only (refused if any admin exists)
//   GET  /api/auth/verify           (Bearer) -> { valid, user }
//
// Passwords hashed with bcrypt. JWTs signed with JWT_SECRET. Default admin is
// seeded from env on boot (seedDefaultAdmin) if the admin_users table is empty.

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function findByUsername(username) {
  const rows = await query(`SELECT * FROM admin_users WHERE username = ?`, [username]);
  return rows[0] || null;
}

async function countAdmins() {
  const rows = await query(`SELECT COUNT(*) AS c FROM admin_users`);
  return rows[0].c;
}

// ── POST /api/auth/login ──
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const user = await findByUsername(username);
    // Constant-ish response: same generic message whether user missing or pw wrong.
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    await query(`UPDATE admin_users SET last_login = NOW() WHERE id = ?`, [user.id]);

    return res.json({
      success: true,
      token: signToken(user),
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/register-admin ── (first-run only)
router.post('/register-admin', async (req, res, next) => {
  try {
    if ((await countAdmins()) > 0) {
      return res.status(403).json({ success: false, message: 'Admin already exists. Registration is closed.' });
    }
    const { username, password, email } = req.body || {};
    if (!username || !password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Username and a password of at least 8 characters are required.',
      });
    }
    const hash = await bcrypt.hash(password, 12);
    const res2 = await query(
      `INSERT INTO admin_users (username, password_hash, email, role) VALUES (?, ?, ?, 'admin')`,
      [username, hash, email || null]
    );
    const user = { id: res2.insertId, username, email: email || null, role: 'admin' };
    return res.status(201).json({ success: true, token: signToken(user), user });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/verify ──
router.get('/verify', verifyToken, (req, res) => {
  res.json({ success: true, valid: true, user: req.user });
});

// ── Default-admin seeding (called from server boot) ──
async function seedDefaultAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.warn('⚠️  ADMIN_USERNAME / ADMIN_PASSWORD not set — skipping default admin seed.');
    return;
  }
  if ((await countAdmins()) > 0) return; // never overwrite an existing admin

  const hash = await bcrypt.hash(password, 12);
  await query(
    `INSERT INTO admin_users (username, password_hash, email, role) VALUES (?, ?, ?, 'admin')`,
    [username, hash, process.env.ADMIN_EMAIL || null]
  );
  console.log(`👤 Default admin "${username}" seeded from env.`);
}

module.exports = { router, seedDefaultAdmin, verifyToken };
