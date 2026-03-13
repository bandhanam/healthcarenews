import pg from 'pg';
const { Pool } = pg;

function getSslConfig() {
  const certContent = process.env.PGSSLROOTCERT_CONTENT;
  if (certContent && certContent.trim()) {
    return { rejectUnauthorized: true, ca: certContent.trim() };
  }
  return { rejectUnauthorized: false };
}

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: getSslConfig(),
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
    });
  }
  return pool;
}
