// ─── ScaleForge — MySQL connection pool ──────────────────────────────────────
// Single shared pool, reused by init, adapter, seed, and all routes.
// Supports EITHER a single DATABASE_URL or discrete DB_* variables.

const mysql = require('mysql2/promise');

let pool = null;

// Build the pool config from env. DATABASE_URL wins if present.
function buildConfig() {
  const common = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4_unicode_ci',
    // Return DATE/DATETIME as strings so we control formatting ourselves.
    dateStrings: true,
  };

  // TiDB Cloud (and many hosted MySQL providers) require SSL.
  // Enable automatically when DB_SSL=true or when using a known cloud port (4000).
  const useSSL = process.env.DB_SSL === 'true' ||
    Number(process.env.DB_PORT) === 4000;
  const sslConfig = useSSL ? { ssl: { rejectUnauthorized: true } } : {};

  if (process.env.DATABASE_URL) {
    return { uri: process.env.DATABASE_URL, ...common, ...sslConfig };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'scaleforge',
    ...common,
    ...sslConfig,
  };
}

// Lazily create and return the shared pool.
function getPool() {
  if (!pool) {
    const cfg = buildConfig();
    pool = cfg.uri ? mysql.createPool(cfg.uri) : mysql.createPool(cfg);
  }
  return pool;
}

// Thin query helper — always parameterized. Returns rows only.
async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

// For statements where execute() can't be used (e.g. DDL with no params),
// fall back to query(). Use only with trusted, non-user-input SQL.
async function raw(sql) {
  const [result] = await getPool().query(sql);
  return result;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, query, raw, closePool, buildConfig };
