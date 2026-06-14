// ─── Platoons X — Leads routes ───────────────────────────────────────────────
//   POST /api/leads        PUBLIC — contact form. Saves to DB AND mirrors to
//                          the existing Google Sheet (best-effort, non-blocking).
//   GET  /api/leads        🔒 admin inbox
//   PUT  /api/leads/:id     🔒 update status / notes
//
// The Sheets mirror keeps the owner's current workflow intact. If the mirror
// fails, the DB save still succeeds and the visitor still gets a success reply.

const express = require('express');
const fetch = require('node-fetch');
const db = require('../database/adapter');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ''));

// Fire-and-forget mirror to Google Apps Script (same params the site uses today).
async function mirrorToSheets(lead) {
  const url = process.env.GOOGLE_SCRIPT_URL;
  if (!url) return; // mirror disabled if not configured
  try {
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const params = new URLSearchParams({
      timestamp,
      date: timestamp,
      name: lead.name || '',
      businessName: lead.business_name || '',
      businessname: lead.business_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      service: lead.service || '',
      serviceintrested: lead.service || '',
      budget: lead.budget || '',
      monthlybudget: lead.budget || '',
      goals: lead.goals || '',
      businessgoals: lead.goals || '',
    });
    await fetch(`${url}?${params.toString()}`, { redirect: 'follow' });
  } catch (err) {
    console.error('⚠️  Google Sheets mirror failed:', err.message);
  }
}

// ── POST /api/leads (public) ──
router.post('/', async (req, res, next) => {
  try {
    const b = req.body || {};
    // Accept both snake_case and the front-end's field names.
    const lead = {
      name: (b.name || '').trim(),
      business_name: (b.business_name || b.businessName || '').trim(),
      email: (b.email || '').trim(),
      phone: (b.phone || '').trim(),
      service: (b.service || '').trim(),
      budget: (b.budget || '').trim(),
      goals: (b.goals || '').trim(),
      source: b.source || 'website',
    };

    if (!lead.name || !lead.email || !lead.phone) {
      return res.status(400).json({ success: false, message: 'Name, email and phone are required.' });
    }
    if (!isEmail(lead.email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const saved = await db.leads.create(lead);

    // Mirror to Sheets without blocking the response.
    mirrorToSheets(lead);

    return res.status(201).json({ success: true, message: 'Thanks! We\'ll be in touch shortly.', id: saved.id });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/leads (protected inbox) ──
router.get('/', verifyToken, async (req, res, next) => {
  try {
    res.json({ success: true, data: await db.leads.list() });
  } catch (err) { next(err); }
});

// ── PUT /api/leads/:id (protected) ──
router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const existing = await db.leads.getById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });
    const updated = await db.leads.update(req.params.id, {
      status: req.body?.status,
      notes: req.body?.notes,
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

module.exports = router;
