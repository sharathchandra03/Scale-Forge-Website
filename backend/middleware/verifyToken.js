// ─── ScaleForge — JWT auth middleware ────────────────────────────────────────
// Protects all write/admin endpoints. Reads `Authorization: Bearer <token>`,
// verifies it against JWT_SECRET, and attaches req.user on success.

const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, username, role }
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

module.exports = verifyToken;
