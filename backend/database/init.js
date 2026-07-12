// ─── ScaleForge — Database schema init ───────────────────────────────────────
// Idempotent: safe to run repeatedly. Creates every table IF NOT EXISTS and
// uses ensureColumn() so new columns can be added later without data loss.
//
// Run standalone:  npm run db:init
// Or call initDatabase() from server boot.

require('dotenv').config();
const { raw, query, closePool } = require('./connection');

// ── Non-destructive column migration helper ──────────────────────────────────
// Adds `columnDdl` to `table` only if `column` does not already exist.
async function ensureColumn(table, column, columnDdl) {
  const rows = await query(
    `SELECT COUNT(*) AS c
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (rows[0].c === 0) {
    await raw(`ALTER TABLE \`${table}\` ADD COLUMN ${columnDdl}`);
    console.log(`  + ${table}.${column} added`);
  }
}

// Shared trailing column convention for content tables.
const TS = `
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
`;

async function initDatabase() {
  console.log('🗄️  Initializing ScaleForge schema…');

  // ── admin_users ──
  await raw(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      username      VARCHAR(64) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      email         VARCHAR(190),
      role          VARCHAR(32) NOT NULL DEFAULT 'admin',
      is_active     TINYINT(1) NOT NULL DEFAULT 1,
      last_login    DATETIME NULL,
      ${TS}
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── services ──
  await raw(`
    CREATE TABLE IF NOT EXISTS services (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      number      VARCHAR(8),
      icon        VARCHAR(16),
      metric      VARCHAR(120),
      title       VARCHAR(160) NOT NULL,
      description TEXT,
      tags        JSON,
      sort_order  INT NOT NULL DEFAULT 0,
      status      ENUM('published','draft') NOT NULL DEFAULT 'published',
      ${TS}
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── pricing_plans ──
  await raw(`
    CREATE TABLE IF NOT EXISTS pricing_plans (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      tier            VARCHAR(80) NOT NULL,
      price_monthly   VARCHAR(40),
      price_quarterly VARCHAR(40),
      emi_text        VARCHAR(160),
      description     TEXT,
      cta_label       VARCHAR(80) DEFAULT 'Get Started',
      is_featured     TINYINT(1) NOT NULL DEFAULT 0,
      sort_order      INT NOT NULL DEFAULT 0,
      status          ENUM('published','draft') NOT NULL DEFAULT 'published',
      ${TS}
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── pricing_features (child of pricing_plans) ──
  await raw(`
    CREATE TABLE IF NOT EXISTS pricing_features (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      plan_id    INT NOT NULL,
      label      VARCHAR(200) NOT NULL,
      is_enabled TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      CONSTRAINT fk_feature_plan FOREIGN KEY (plan_id)
        REFERENCES pricing_plans(id) ON DELETE CASCADE,
      INDEX idx_feature_plan (plan_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── team_members ──
  await raw(`
    CREATE TABLE IF NOT EXISTS team_members (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      name          VARCHAR(120) NOT NULL,
      role          VARCHAR(120),
      initials      VARCHAR(8),
      avatar_color  VARCHAR(32) DEFAULT 'var(--orange)',
      photo_media_id INT NULL,
      description   TEXT,
      linkedin_url  VARCHAR(255),
      sort_order    INT NOT NULL DEFAULT 0,
      status        ENUM('published','draft') NOT NULL DEFAULT 'published',
      ${TS}
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── testimonials ──
  await raw(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      quote           TEXT NOT NULL,
      author_name     VARCHAR(120) NOT NULL,
      author_company  VARCHAR(160),
      rating          TINYINT NOT NULL DEFAULT 5,
      avatar_initials VARCHAR(8),
      accent_color    VARCHAR(32) DEFAULT 'var(--orange)',
      sort_order      INT NOT NULL DEFAULT 0,
      status          ENUM('published','draft') NOT NULL DEFAULT 'published',
      ${TS}
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── faqs ──
  await raw(`
    CREATE TABLE IF NOT EXISTS faqs (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      question   VARCHAR(255) NOT NULL,
      answer     TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      status     ENUM('published','draft') NOT NULL DEFAULT 'published',
      ${TS}
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── process_steps ──
  await raw(`
    CREATE TABLE IF NOT EXISTS process_steps (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      step_number INT NOT NULL,
      title       VARCHAR(120) NOT NULL,
      badge       VARCHAR(80),
      emoji       VARCHAR(16),
      color       VARCHAR(32),
      glow        VARCHAR(48),
      related_ids JSON,
      content     TEXT,
      sort_order  INT NOT NULL DEFAULT 0,
      status      ENUM('published','draft') NOT NULL DEFAULT 'published',
      ${TS}
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── ai_features ──
  await raw(`
    CREATE TABLE IF NOT EXISTS ai_features (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      icon        VARCHAR(255),
      title       VARCHAR(160) NOT NULL,
      description TEXT,
      sort_order  INT NOT NULL DEFAULT 0,
      status      ENUM('published','draft') NOT NULL DEFAULT 'published',
      ${TS}
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── stats (hero + results numbers) ──
  await raw(`
    CREATE TABLE IF NOT EXISTS stats (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      section    VARCHAR(32) NOT NULL DEFAULT 'results',
      value      VARCHAR(40) NOT NULL,
      suffix     VARCHAR(24),
      label      VARCHAR(160) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      status     ENUM('published','draft') NOT NULL DEFAULT 'published',
      ${TS}
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── why_pillars ──
  await raw(`
    CREATE TABLE IF NOT EXISTS why_pillars (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      ghost_number VARCHAR(8),
      icon         VARCHAR(16),
      stat         VARCHAR(40),
      sublabel     VARCHAR(160),
      title        VARCHAR(160) NOT NULL,
      description  TEXT,
      sort_order   INT NOT NULL DEFAULT 0,
      status       ENUM('published','draft') NOT NULL DEFAULT 'published',
      ${TS}
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── blog_posts ──
  await raw(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      title         VARCHAR(200) NOT NULL,
      slug          VARCHAR(220) NOT NULL UNIQUE,
      excerpt       VARCHAR(500),
      body          LONGTEXT,
      cover_media_id INT NULL,
      author        VARCHAR(120) DEFAULT 'ScaleForge',
      category      VARCHAR(80),
      tags          JSON,
      status        ENUM('draft','published','scheduled') NOT NULL DEFAULT 'draft',
      publish_date  DATETIME NULL,
      ${TS},
      INDEX idx_blog_status_date (status, publish_date),
      INDEX idx_blog_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── leads (contact form submissions) ──
  await raw(`
    CREATE TABLE IF NOT EXISTS leads (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      name          VARCHAR(160) NOT NULL,
      business_name VARCHAR(200),
      email         VARCHAR(190) NOT NULL,
      phone         VARCHAR(40) NOT NULL,
      service       VARCHAR(120),
      budget        VARCHAR(80),
      goals         TEXT,
      source        VARCHAR(60) DEFAULT 'website',
      status        ENUM('new','contacted','won','lost') NOT NULL DEFAULT 'new',
      notes         TEXT,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_leads_created (created_at),
      INDEX idx_leads_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── media (blob fallback store) ──
  await raw(`
    CREATE TABLE IF NOT EXISTS media (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      filename   VARCHAR(255) NOT NULL,
      mime_type  VARCHAR(120) NOT NULL,
      size_bytes INT NOT NULL DEFAULT 0,
      data       LONGBLOB,
      url        VARCHAR(500) NULL,
      alt_text   VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── site_settings (key/value) ──
  await raw(`
    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key VARCHAR(80) PRIMARY KEY,
      value       TEXT,
      updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── Non-destructive future migrations go here (examples of the pattern) ──
  // await ensureColumn('blog_posts', 'reading_minutes', 'reading_minutes INT NULL');
  // await ensureColumn('services', 'cta_link', 'cta_link VARCHAR(255) NULL');

  console.log('✅ Schema ready.');
}

module.exports = { initDatabase, ensureColumn };

// Allow `node backend/database/init.js` to run standalone.
if (require.main === module) {
  initDatabase()
    .then(() => closePool())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ DB init failed:', err.message);
      process.exit(1);
    });
}
