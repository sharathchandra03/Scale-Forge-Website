// ─── ScaleForge — Database adapter layer ─────────────────────────────────────
// Abstracts queries away from the route files so swapping/upgrading the DB
// engine later is contained here. Centralizes:
//   • a generic CRUD factory for simple content tables
//   • JSON column normalization
//   • scheduled-publish logic for the blog
//   • slug generation
// Every query is parameterized — no string interpolation of user input.

const { query } = require('./connection');

// Columns that hold JSON and should be parsed on read / stringified on write.
const JSON_COLUMNS = {
  services: ['tags'],
  process_steps: ['related_ids'],
  blog_posts: ['tags'],
};

// Parse JSON columns coming back from MySQL (mysql2 may return string or object).
function parseRow(table, row) {
  if (!row) return row;
  const jsonCols = JSON_COLUMNS[table] || [];
  for (const col of jsonCols) {
    if (typeof row[col] === 'string') {
      try { row[col] = JSON.parse(row[col]); } catch { row[col] = null; }
    }
  }
  return row;
}

function parseRows(table, rows) {
  return rows.map((r) => parseRow(table, r));
}

// Serialize a payload's JSON columns for writing.
function serialize(table, data) {
  const out = { ...data };
  const jsonCols = JSON_COLUMNS[table] || [];
  for (const col of jsonCols) {
    if (col in out && out[col] !== null && typeof out[col] !== 'string') {
      out[col] = JSON.stringify(out[col]);
    }
  }
  return out;
}

// ── Generic CRUD factory ─────────────────────────────────────────────────────
// `allowed` is the whitelist of writable columns (prevents mass-assignment).
function makeCrud(table, allowed, opts = {}) {
  const orderBy = opts.orderBy || 'sort_order ASC, id ASC';
  const hasStatus = opts.hasStatus !== false; // most content tables have it

  // Keep only whitelisted keys that are actually present in the payload.
  function pick(data) {
    const clean = serialize(table, data);
    const cols = [];
    const vals = [];
    for (const key of allowed) {
      if (key in clean && clean[key] !== undefined) {
        cols.push(key);
        vals.push(clean[key]);
      }
    }
    return { cols, vals };
  }

  return {
    // Public list — published only (unless includeAll).
    async list({ includeAll = false } = {}) {
      let sql = `SELECT * FROM \`${table}\``;
      if (hasStatus && !includeAll) sql += ` WHERE status = 'published'`;
      sql += ` ORDER BY ${orderBy}`;
      return parseRows(table, await query(sql));
    },

    async getById(id) {
      const rows = await query(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
      return parseRow(table, rows[0]) || null;
    },

    async create(data) {
      const { cols, vals } = pick(data);
      if (!cols.length) throw new Error('No valid fields to insert');
      const placeholders = cols.map(() => '?').join(', ');
      const colList = cols.map((c) => `\`${c}\``).join(', ');
      const res = await query(
        `INSERT INTO \`${table}\` (${colList}) VALUES (${placeholders})`,
        vals
      );
      return this.getById(res.insertId);
    },

    async update(id, data) {
      const { cols, vals } = pick(data);
      if (!cols.length) return this.getById(id);
      const assignments = cols.map((c) => `\`${c}\` = ?`).join(', ');
      await query(
        `UPDATE \`${table}\` SET ${assignments} WHERE id = ?`,
        [...vals, id]
      );
      return this.getById(id);
    },

    async remove(id) {
      const res = await query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
      return res.affectedRows > 0;
    },

    async count() {
      const rows = await query(`SELECT COUNT(*) AS c FROM \`${table}\``);
      return rows[0].c;
    },
  };
}

// ── Simple content resources ─────────────────────────────────────────────────
const resources = {
  services: makeCrud('services', [
    'number', 'icon', 'metric', 'title', 'description', 'tags', 'sort_order', 'status',
  ]),
  team: makeCrud('team_members', [
    'name', 'role', 'initials', 'avatar_color', 'photo_media_id',
    'description', 'linkedin_url', 'sort_order', 'status',
  ]),
  testimonials: makeCrud('testimonials', [
    'quote', 'author_name', 'author_company', 'rating',
    'avatar_initials', 'accent_color', 'sort_order', 'status',
  ]),
  faqs: makeCrud('faqs', ['question', 'answer', 'sort_order', 'status']),
  process_steps: makeCrud('process_steps', [
    'step_number', 'title', 'badge', 'emoji', 'color', 'glow',
    'related_ids', 'content', 'sort_order', 'status',
  ]),
  ai_features: makeCrud('ai_features', ['icon', 'title', 'description', 'sort_order', 'status']),
  stats: makeCrud('stats', ['section', 'value', 'suffix', 'label', 'sort_order', 'status']),
  why_pillars: makeCrud('why_pillars', [
    'ghost_number', 'icon', 'stat', 'sublabel', 'title', 'description', 'sort_order', 'status',
  ]),
};

// ── Pricing: plans with nested features ──────────────────────────────────────
const PLAN_FIELDS = [
  'tier', 'price_monthly', 'price_quarterly', 'emi_text',
  'description', 'cta_label', 'is_featured', 'sort_order', 'status',
];
const plansCrud = makeCrud('pricing_plans', PLAN_FIELDS);

async function getFeatures(planId) {
  return query(
    `SELECT id, label, is_enabled, sort_order
       FROM pricing_features WHERE plan_id = ? ORDER BY sort_order ASC, id ASC`,
    [planId]
  );
}

async function replaceFeatures(planId, features = []) {
  await query(`DELETE FROM pricing_features WHERE plan_id = ?`, [planId]);
  let i = 0;
  for (const f of features) {
    await query(
      `INSERT INTO pricing_features (plan_id, label, is_enabled, sort_order)
       VALUES (?, ?, ?, ?)`,
      [planId, f.label, f.is_enabled ? 1 : 0, f.sort_order != null ? f.sort_order : i]
    );
    i++;
  }
}

const pricing = {
  async list({ includeAll = false } = {}) {
    const plans = await plansCrud.list({ includeAll });
    for (const plan of plans) plan.features = await getFeatures(plan.id);
    return plans;
  },
  async getById(id) {
    const plan = await plansCrud.getById(id);
    if (plan) plan.features = await getFeatures(plan.id);
    return plan;
  },
  async create(data) {
    const plan = await plansCrud.create(data);
    if (Array.isArray(data.features)) await replaceFeatures(plan.id, data.features);
    return this.getById(plan.id);
  },
  async update(id, data) {
    await plansCrud.update(id, data);
    if (Array.isArray(data.features)) await replaceFeatures(id, data.features);
    return this.getById(id);
  },
  remove: (id) => plansCrud.remove(id),
  count: () => plansCrud.count(),
};

// ── Blog: slug + scheduled publishing ────────────────────────────────────────
const BLOG_FIELDS = [
  'title', 'slug', 'excerpt', 'body', 'cover_media_id',
  'author', 'category', 'tags', 'status', 'publish_date',
];
const blogCrud = makeCrud('blog_posts', BLOG_FIELDS, { orderBy: 'publish_date DESC, id DESC' });

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

// Ensure slug uniqueness by appending -2, -3, … if needed.
async function uniqueSlug(base, ignoreId = null) {
  let slug = slugify(base) || 'post';
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await query(
      `SELECT id FROM blog_posts WHERE slug = ?${ignoreId ? ' AND id <> ?' : ''}`,
      ignoreId ? [slug, ignoreId] : [slug]
    );
    if (rows.length === 0) return slug;
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
}

const blog = {
  // Public: published, plus scheduled posts whose time has arrived.
  async listPublic() {
    const rows = await query(
      `SELECT id, title, slug, excerpt, cover_media_id, author, category, tags, publish_date, created_at
         FROM blog_posts
        WHERE status = 'published'
           OR (status = 'scheduled' AND publish_date IS NOT NULL AND publish_date <= NOW())
        ORDER BY COALESCE(publish_date, created_at) DESC, id DESC`
    );
    return parseRows('blog_posts', rows);
  },
  async getPublicBySlug(slug) {
    const rows = await query(
      `SELECT * FROM blog_posts
        WHERE slug = ?
          AND (status = 'published'
               OR (status = 'scheduled' AND publish_date IS NOT NULL AND publish_date <= NOW()))`,
      [slug]
    );
    return parseRow('blog_posts', rows[0]) || null;
  },
  // Admin: everything.
  async listAll() {
    return parseRows('blog_posts', await query(
      `SELECT * FROM blog_posts ORDER BY COALESCE(publish_date, created_at) DESC, id DESC`
    ));
  },
  getById: (id) => blogCrud.getById(id),
  async create(data) {
    const payload = { ...data };
    payload.slug = await uniqueSlug(payload.slug || payload.title || 'post');
    return blogCrud.create(payload);
  },
  async update(id, data) {
    const payload = { ...data };
    if (payload.slug || payload.title) {
      payload.slug = await uniqueSlug(payload.slug || payload.title, id);
    }
    return blogCrud.update(id, payload);
  },
  remove: (id) => blogCrud.remove(id),
  count: () => blogCrud.count(),
};

// ── Leads ────────────────────────────────────────────────────────────────────
const leads = {
  async create(d) {
    const res = await query(
      `INSERT INTO leads (name, business_name, email, phone, service, budget, goals, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.name, d.business_name || null, d.email, d.phone,
       d.service || null, d.budget || null, d.goals || null, d.source || 'website']
    );
    const rows = await query(`SELECT * FROM leads WHERE id = ?`, [res.insertId]);
    return rows[0];
  },
  async list() {
    return query(`SELECT * FROM leads ORDER BY created_at DESC, id DESC`);
  },
  async update(id, d) {
    const fields = [];
    const vals = [];
    if (d.status !== undefined) { fields.push('status = ?'); vals.push(d.status); }
    if (d.notes !== undefined) { fields.push('notes = ?'); vals.push(d.notes); }
    if (!fields.length) return this.getById(id);
    await query(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`, [...vals, id]);
    return this.getById(id);
  },
  async getById(id) {
    const rows = await query(`SELECT * FROM leads WHERE id = ?`, [id]);
    return rows[0] || null;
  },
  count: async () => (await query(`SELECT COUNT(*) AS c FROM leads`))[0].c,
  countNew: async () => (await query(`SELECT COUNT(*) AS c FROM leads WHERE status = 'new'`))[0].c,
};

// ── Media (blob store) ───────────────────────────────────────────────────────
const media = {
  async create({ filename, mime_type, size_bytes, data, url = null, alt_text = null }) {
    const res = await query(
      `INSERT INTO media (filename, mime_type, size_bytes, data, url, alt_text)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [filename, mime_type, size_bytes, data, url, alt_text]
    );
    return this.getMeta(res.insertId);
  },
  // Metadata only (no blob) — for listings.
  async getMeta(id) {
    const rows = await query(
      `SELECT id, filename, mime_type, size_bytes, url, alt_text, created_at
         FROM media WHERE id = ?`, [id]
    );
    return rows[0] || null;
  },
  // Full row including blob — for serving.
  async getBlob(id) {
    const rows = await query(
      `SELECT id, filename, mime_type, size_bytes, data, url FROM media WHERE id = ?`, [id]
    );
    return rows[0] || null;
  },
  async list() {
    return query(
      `SELECT id, filename, mime_type, size_bytes, url, alt_text, created_at
         FROM media ORDER BY created_at DESC, id DESC`
    );
  },
  async remove(id) {
    const res = await query(`DELETE FROM media WHERE id = ?`, [id]);
    return res.affectedRows > 0;
  },
  count: async () => (await query(`SELECT COUNT(*) AS c FROM media`))[0].c,
};

// ── Site settings (key/value) ────────────────────────────────────────────────
const settings = {
  async all() {
    const rows = await query(`SELECT setting_key, value FROM site_settings`);
    const obj = {};
    for (const r of rows) obj[r.setting_key] = r.value;
    return obj;
  },
  async set(key, value) {
    await query(
      `INSERT INTO site_settings (setting_key, value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [key, value]
    );
  },
  async setMany(obj = {}) {
    for (const [k, v] of Object.entries(obj)) await this.set(k, v);
    return this.all();
  },
};

module.exports = {
  ...resources,       // services, team, testimonials, faqs, process_steps, ai_features, stats, why_pillars
  pricing,
  blog,
  leads,
  media,
  settings,
  slugify,
  // expose for tests / advanced use
  _makeCrud: makeCrud,
};
