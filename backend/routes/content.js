// ─── ScaleForge — Content routes ─────────────────────────────────────────────
// Mounts every marketing content resource under /api. Simple resources use the
// generic crudRouter; pricing, blog, and settings have bespoke routers.

const express = require('express');
const db = require('../database/adapter');
const crudRouter = require('./crudRouter');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// ── Simple content resources (validation kept light but present) ──
const req = (body, fields) => {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || String(body[f]).trim() === '') {
      return `Field "${f}" is required.`;
    }
  }
  return null;
};

router.use('/services',      crudRouter(db.services,      { validate: (b) => req(b, ['title']) }));
router.use('/team',          crudRouter(db.team,          { validate: (b) => req(b, ['name']) }));
router.use('/testimonials',  crudRouter(db.testimonials,  { validate: (b) => req(b, ['quote', 'author_name']) }));
router.use('/faqs',          crudRouter(db.faqs,          { validate: (b) => req(b, ['question', 'answer']) }));
router.use('/process-steps', crudRouter(db.process_steps, { validate: (b) => req(b, ['title']) }));
router.use('/ai-features',   crudRouter(db.ai_features,   { validate: (b) => req(b, ['title']) }));
router.use('/stats',         crudRouter(db.stats,         { validate: (b) => req(b, ['value', 'label']) }));
router.use('/pillars',       crudRouter(db.why_pillars,   { validate: (b) => req(b, ['title']) }));

// ── Pricing (plans + nested features) ──
const pricing = express.Router();
pricing.get('/', async (req2, res, next) => {
  try {
    const wantsAll = req2.query.all === '1';
    if (wantsAll) {
      return verifyToken(req2, res, async () => {
        res.json({ success: true, data: await db.pricing.list({ includeAll: true }) });
      });
    }
    res.json({ success: true, data: await db.pricing.list() });
  } catch (err) { next(err); }
});
pricing.get('/:id', async (req2, res, next) => {
  try {
    const row = await db.pricing.getById(req2.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});
pricing.post('/', verifyToken, async (req2, res, next) => {
  try {
    if (!req2.body || !req2.body.tier) {
      return res.status(400).json({ success: false, message: 'Field "tier" is required.' });
    }
    res.status(201).json({ success: true, data: await db.pricing.create(req2.body) });
  } catch (err) { next(err); }
});
pricing.put('/:id', verifyToken, async (req2, res, next) => {
  try {
    const existing = await db.pricing.getById(req2.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: await db.pricing.update(req2.params.id, req2.body || {}) });
  } catch (err) { next(err); }
});
pricing.delete('/:id', verifyToken, async (req2, res, next) => {
  try {
    const ok = await db.pricing.remove(req2.params.id);
    if (!ok) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true });
  } catch (err) { next(err); }
});
router.use('/pricing', pricing);

// ── Blog (public reads by slug; admin CRUD by id) ──
const blog = express.Router();
blog.get('/', async (req2, res, next) => {
  try {
    if (req2.query.all === '1') {
      return verifyToken(req2, res, async () => {
        res.json({ success: true, data: await db.blog.listAll() });
      });
    }
    res.json({ success: true, data: await db.blog.listPublic() });
  } catch (err) { next(err); }
});
// Admin fetch by numeric id (for editing drafts) — must be before /:slug.
blog.get('/id/:id', verifyToken, async (req2, res, next) => {
  try {
    const row = await db.blog.getById(req2.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});
blog.get('/:slug', async (req2, res, next) => {
  try {
    const row = await db.blog.getPublicBySlug(req2.params.slug);
    if (!row) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});
blog.post('/', verifyToken, async (req2, res, next) => {
  try {
    if (!req2.body || !req2.body.title) {
      return res.status(400).json({ success: false, message: 'Field "title" is required.' });
    }
    res.status(201).json({ success: true, data: await db.blog.create(req2.body) });
  } catch (err) { next(err); }
});
blog.put('/:id', verifyToken, async (req2, res, next) => {
  try {
    const existing = await db.blog.getById(req2.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, data: await db.blog.update(req2.params.id, req2.body || {}) });
  } catch (err) { next(err); }
});
blog.delete('/:id', verifyToken, async (req2, res, next) => {
  try {
    const ok = await db.blog.remove(req2.params.id);
    if (!ok) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true });
  } catch (err) { next(err); }
});
router.use('/blog', blog);

// ── Site settings (public read, protected write) ──
const settings = express.Router();
settings.get('/', async (req2, res, next) => {
  try {
    res.json({ success: true, data: await db.settings.all() });
  } catch (err) { next(err); }
});
settings.put('/', verifyToken, async (req2, res, next) => {
  try {
    const data = await db.settings.setMany(req2.body || {});
    res.json({ success: true, data });
  } catch (err) { next(err); }
});
router.use('/settings', settings);

module.exports = router;
