// ─── Platoons X — Generic CRUD router factory ────────────────────────────────
// Builds a RESTful router for a simple content resource backed by an adapter
// object that exposes list/getById/create/update/remove. Public reads, all
// writes guarded by verifyToken.
//
//   GET    /          public list (published only; ?all=1 requires auth)
//   GET    /:id       public single
//   POST   /          protected create
//   PUT    /:id       protected update
//   DELETE /:id       protected delete

const express = require('express');
const verifyToken = require('../middleware/verifyToken');

// `validate(body)` may return a string error message to reject the write.
function crudRouter(model, { validate } = {}) {
  const router = express.Router();

  // Public list. If ?all=1 is requested, require a valid token (admin view).
  router.get('/', async (req, res, next) => {
    try {
      const wantsAll = req.query.all === '1' || req.query.all === 'true';
      if (wantsAll) {
        // Lazily auth-check: only admins may see drafts.
        return verifyToken(req, res, async () => {
          res.json({ success: true, data: await model.list({ includeAll: true }) });
        });
      }
      res.json({ success: true, data: await model.list() });
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const row = await model.getById(req.params.id);
      if (!row) return res.status(404).json({ success: false, message: 'Not found.' });
      res.json({ success: true, data: row });
    } catch (err) { next(err); }
  });

  router.post('/', verifyToken, async (req, res, next) => {
    try {
      if (validate) {
        const msg = validate(req.body || {});
        if (msg) return res.status(400).json({ success: false, message: msg });
      }
      const row = await model.create(req.body || {});
      res.status(201).json({ success: true, data: row });
    } catch (err) { next(err); }
  });

  router.put('/:id', verifyToken, async (req, res, next) => {
    try {
      const existing = await model.getById(req.params.id);
      if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });
      if (validate) {
        const msg = validate(req.body || {}, true);
        if (msg) return res.status(400).json({ success: false, message: msg });
      }
      const row = await model.update(req.params.id, req.body || {});
      res.json({ success: true, data: row });
    } catch (err) { next(err); }
  });

  router.delete('/:id', verifyToken, async (req, res, next) => {
    try {
      const ok = await model.remove(req.params.id);
      if (!ok) return res.status(404).json({ success: false, message: 'Not found.' });
      res.json({ success: true });
    } catch (err) { next(err); }
  });

  return router;
}

module.exports = crudRouter;
