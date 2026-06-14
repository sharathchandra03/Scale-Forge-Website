// ─── Platoons X — Media routes ───────────────────────────────────────────────
//   POST   /api/media        🔒 upload (multipart "file"); validated mime+size,
//                            stored as a DB blob (Cloudinary later via env).
//   GET    /api/media        🔒 list (metadata only)
//   GET    /api/media/:id     PUBLIC — serves the stored image bytes
//   DELETE /api/media/:id     🔒 delete
//
// Blob fallback keeps the site self-contained: no external image host required.

const express = require('express');
const multer = require('multer');
const db = require('../database/adapter');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

const MAX_MB = Number(process.env.MAX_UPLOAD_MB) || 5;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new Error('Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, SVG.'));
    }
    cb(null, true);
  },
});

// ── POST /api/media (protected) ──
router.post('/', verifyToken, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? `File too large. Max ${MAX_MB} MB.`
        : err.message || 'Upload failed.';
      return res.status(400).json({ success: false, message: msg });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided (field name "file").' });
    }
    try {
      const meta = await db.media.create({
        filename: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        data: req.file.buffer,
        alt_text: req.body?.alt_text || null,
      });
      // The client uses this URL to reference the image anywhere.
      meta.url = `/api/media/${meta.id}`;
      res.status(201).json({ success: true, data: meta });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Could not store file.' });
    }
  });
});

// ── GET /api/media (protected list) ──
router.get('/', verifyToken, async (req, res, next) => {
  try {
    res.json({ success: true, data: await db.media.list() });
  } catch (err) { next(err); }
});

// ── GET /api/media/:id (public serve) ──
router.get('/:id', async (req, res, next) => {
  try {
    const row = await db.media.getBlob(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found.' });

    // If stored on a cloud host, redirect there instead of serving bytes.
    if (row.url && !row.data) return res.redirect(row.url);

    res.setHeader('Content-Type', row.mime_type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(row.data);
  } catch (err) { next(err); }
});

// ── DELETE /api/media/:id (protected) ──
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const ok = await db.media.remove(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
