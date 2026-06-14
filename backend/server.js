// ─── Platoons X — Server entrypoint ──────────────────────────────────────────
// Serves the existing static site + admin panel and mounts the admin API.
// Designed to be additive and crash-resistant:
//   • routes are loaded defensively (one broken route won't take the server down)
//   • /api/health always responds, even if the DB or a route fails to load
//   • global crash handlers keep the process alive on unexpected errors
//
// Boot: load env → init schema (idempotent) → seed default admin → listen.

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..'); // project root (where index.html lives)

// ── Global crash net — never let one bad request kill the process ──
process.on('uncaughtException', (err) => console.error('💥 uncaughtException:', err));
process.on('unhandledRejection', (err) => console.error('💥 unhandledRejection:', err));

// ── CORS — restricted to FRONTEND_URL in prod, open in dev ──
const allowList = (process.env.FRONTEND_URL || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    // Allow same-origin / curl (no origin) and anything in dev (empty allowList).
    if (!origin || allowList.length === 0 || allowList.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check — defined first so it works even if routes below fail ──
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'platoons-x', time: new Date().toISOString() });
});

// ── Defensive route loader ──
function mount(label, mountPath, modulePath, pick) {
  try {
    const mod = require(modulePath);
    const handler = pick ? pick(mod) : mod;
    app.use(mountPath, handler);
    console.log(`  ✓ mounted ${label} at ${mountPath}`);
  } catch (err) {
    console.error(`  ✗ FAILED to mount ${label} (${mountPath}):`, err.message);
  }
}

mount('auth',    '/api/auth',  './routes/auth', (m) => m.router);
mount('leads',   '/api/leads', './routes/leads');
mount('media',   '/api/media', './routes/media');
mount('content', '/api',       './routes/content'); // services, pricing, blog, settings, …

// ── Dashboard stats (protected) — counts for the admin home ──
try {
  const verifyToken = require('./middleware/verifyToken');
  const db = require('./database/adapter');
  app.get('/api/dashboard', verifyToken, async (req, res, next) => {
    try {
      const [
        services, pricing, team, testimonials, faqs, aiFeatures,
        processSteps, stats, pillars, blogCount, leadsTotal, leadsNew, mediaCount,
      ] = await Promise.all([
        db.services.count(), db.pricing.count(), db.team.count(),
        db.testimonials.count(), db.faqs.count(), db.ai_features.count(),
        db.process_steps.count(), db.stats.count(), db.why_pillars.count(),
        db.blog.count(), db.leads.count(), db.leads.countNew(), db.media.count(),
      ]);
      res.json({
        success: true,
        data: {
          services, pricing, team, testimonials, faqs, ai_features: aiFeatures,
          process_steps: processSteps, stats, pillars, blog: blogCount,
          leads: leadsTotal, leads_new: leadsNew, media: mediaCount,
        },
      });
    } catch (err) { next(err); }
  });
  console.log('  ✓ mounted dashboard at /api/dashboard');
} catch (err) {
  console.error('  ✗ FAILED to mount dashboard:', err.message);
}

// ── Static serving of the public site + admin panel ──
// .splinecode needs a special MIME type + range support (kept from legacy server).
app.use(express.static(ROOT, {
  setHeaders(res, filePath) {
    if (path.extname(filePath) === '.splinecode') {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  },
}));

// Friendly alias so /admin opens the panel.
app.get('/admin', (req, res) => res.sendFile(path.join(ROOT, 'admin-panel.html')));

// Friendly alias so /blog opens the standalone blog page.
app.get('/blog', (req, res) => res.sendFile(path.join(ROOT, 'blog.html')));
app.get('/blog/:slug', (req, res) => res.sendFile(path.join(ROOT, 'blog.html')));

// ── 404 for unknown API routes (JSON) ──
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found.' });
});

// ── SPA / site fallback → serve index.html for any other GET ──
app.get('*', (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

// ── Error middleware — safe message to client, full detail to logs ──
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Server error. Please try again.'
      : err.message,
  });
});

// ── Boot sequence ──
async function boot() {
  // DB init + seeding are best-effort: if the DB is unreachable, the static
  // site and /api/health still serve, and the error is logged loudly.
  try {
    const { initDatabase } = require('./database/init');
    await initDatabase();
  } catch (err) {
    console.error('⚠️  DB init skipped/failed:', err.message);
  }
  try {
    const { seedDefaultAdmin } = require('./routes/auth');
    await seedDefaultAdmin();
  } catch (err) {
    console.error('⚠️  Admin seed skipped/failed:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Platoons X server running at http://localhost:${PORT}`);
    console.log(`   Public site : http://localhost:${PORT}/`);
    console.log(`   Admin panel : http://localhost:${PORT}/admin`);
    console.log(`   Health      : http://localhost:${PORT}/api/health\n`);
  });
}

if (require.main === module) {
  boot();
}

module.exports = app;
