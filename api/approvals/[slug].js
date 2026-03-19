import { getPool } from '../_lib/db.js';

function normalizeSlug(slug) {
  if (Array.isArray(slug)) return slug.filter(Boolean);
  if (typeof slug === 'string' && slug.trim()) return [slug.trim()];
  return [];
}

function buildWhere(query) {
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (query.q && query.q.trim()) {
    conditions.push(`(drug_name ILIKE $${paramIdx} OR generic_name ILIKE $${paramIdx} OR active_substance ILIKE $${paramIdx})`);
    params.push(`%${query.q.trim()}%`);
    paramIdx++;
  }

  if (query.source && query.source.trim()) {
    const sources = query.source.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (sources.length) {
      conditions.push(`source = ANY($${paramIdx}::text[])`);
      params.push(sources);
      paramIdx++;
    }
  }

  if (query.category && query.category.trim()) {
    conditions.push(`therapeutic_area ILIKE $${paramIdx}`);
    params.push(`%${query.category.trim()}%`);
    paramIdx++;
  }

  if (query.year && query.year.trim()) {
    conditions.push(`EXTRACT(YEAR FROM approval_date) = $${paramIdx}`);
    params.push(parseInt(query.year, 10));
    paramIdx++;
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
    paramIdx,
  };
}

async function handleSearch(pool, query, res) {
  const { where, params, paramIdx } = buildWhere(query);
  const limit = Math.min(parseInt(query.limit, 10) || 50, 200);
  const offset = Math.max(0, parseInt(query.offset, 10) || 0);

  const countSql = `SELECT COUNT(*) AS total FROM drug_approvals ${where}`;
  const dataSql = `
    SELECT source, source_id, drug_name, generic_name, active_substance,
           manufacturer, approval_date, status, therapeutic_area, indication,
           route, dosage_form, application_type
    FROM drug_approvals
    ${where}
    ORDER BY approval_date DESC NULLS LAST
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const [countRes, dataRes] = await Promise.all([
    pool.query(countSql, params),
    pool.query(dataSql, [...params, limit, offset]),
  ]);

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  return res.status(200).json({
    total: parseInt(countRes.rows[0].total, 10),
    limit,
    offset,
    results: dataRes.rows,
  });
}

async function handleStats(pool, res) {
  const [bySource, byYear, byArea] = await Promise.all([
    pool.query('SELECT source, COUNT(*) AS count FROM drug_approvals GROUP BY source ORDER BY source'),
    pool.query(`SELECT EXTRACT(YEAR FROM approval_date)::int AS year, source, COUNT(*) AS count
                FROM drug_approvals
                WHERE approval_date IS NOT NULL
                GROUP BY year, source
                ORDER BY year DESC
                LIMIT 200`),
    pool.query(`SELECT therapeutic_area, COUNT(*) AS count
                FROM drug_approvals
                WHERE therapeutic_area IS NOT NULL AND therapeutic_area != ''
                GROUP BY therapeutic_area
                ORDER BY count DESC
                LIMIT 30`),
  ]);

  const totalCount = bySource.rows.reduce((sum, r) => sum + parseInt(r.count, 10), 0);
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  return res.status(200).json({
    totalCount,
    bySource: bySource.rows.map((r) => ({ source: r.source, count: parseInt(r.count, 10) })),
    byYear: byYear.rows.map((r) => ({ year: r.year, source: r.source, count: parseInt(r.count, 10) })),
    byArea: byArea.rows.map((r) => ({ area: r.therapeutic_area, count: parseInt(r.count, 10) })),
  });
}

async function handleCompetitors(pool, query, res) {
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (query.q && query.q.trim()) {
    conditions.push(`(drug_name ILIKE $${paramIdx} OR generic_name ILIKE $${paramIdx} OR active_substance ILIKE $${paramIdx} OR manufacturer ILIKE $${paramIdx})`);
    params.push(`%${query.q.trim()}%`);
    paramIdx++;
  }

  if (query.category && query.category.trim()) {
    conditions.push(`therapeutic_area ILIKE $${paramIdx}`);
    params.push(`%${query.category.trim()}%`);
    paramIdx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const lim = Math.min(parseInt(query.limit, 10) || 20, 50);

  const byManufacturer = await pool.query(
    `SELECT manufacturer, source, COUNT(*) AS count
     FROM drug_approvals
     ${where}
     ${conditions.length ? 'AND' : 'WHERE'} manufacturer IS NOT NULL AND manufacturer != ''
     GROUP BY manufacturer, source
     ORDER BY count DESC
     LIMIT 200`,
    params,
  );

  const byManufacturerYear = await pool.query(
    `SELECT manufacturer, EXTRACT(YEAR FROM approval_date)::int AS year, COUNT(*) AS count
     FROM drug_approvals
     ${where}
     ${conditions.length ? 'AND' : 'WHERE'} manufacturer IS NOT NULL AND manufacturer != '' AND approval_date IS NOT NULL
     GROUP BY manufacturer, year
     ORDER BY year DESC
     LIMIT 500`,
    params,
  );

  const topDrugs = await pool.query(
    `SELECT manufacturer, drug_name, generic_name, source, approval_date, therapeutic_area
     FROM drug_approvals
     ${where}
     ${conditions.length ? 'AND' : 'WHERE'} manufacturer IS NOT NULL AND manufacturer != ''
     ORDER BY approval_date DESC NULLS LAST
     LIMIT 200`,
    params,
  );

  const mfrMap = {};
  byManufacturer.rows.forEach((r) => {
    const key = r.manufacturer;
    if (!mfrMap[key]) mfrMap[key] = { manufacturer: key, total: 0, bySrc: {} };
    const cnt = parseInt(r.count, 10);
    mfrMap[key].total += cnt;
    mfrMap[key].bySrc[r.source] = cnt;
  });

  const ranked = Object.values(mfrMap).sort((a, b) => b.total - a.total).slice(0, lim);

  const mfrTimeline = {};
  byManufacturerYear.rows.forEach((r) => {
    const key = r.manufacturer;
    if (!mfrTimeline[key]) mfrTimeline[key] = [];
    mfrTimeline[key].push({ year: r.year, count: parseInt(r.count, 10) });
  });

  const mfrDrugs = {};
  topDrugs.rows.forEach((r) => {
    const key = r.manufacturer;
    if (!mfrDrugs[key]) mfrDrugs[key] = [];
    if (mfrDrugs[key].length < 10) {
      mfrDrugs[key].push({
        drug_name: r.drug_name,
        generic_name: r.generic_name,
        source: r.source,
        approval_date: r.approval_date,
        therapeutic_area: r.therapeutic_area,
      });
    }
  });

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  return res.status(200).json({
    competitors: ranked.map((c) => ({
      ...c,
      timeline: mfrTimeline[c.manufacturer] || [],
      drugs: mfrDrugs[c.manufacturer] || [],
    })),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const [action] = normalizeSlug(req.query.slug);
  const pool = getPool();

  try {
    if (action === 'search') return await handleSearch(pool, req.query, res);
    if (action === 'stats') return await handleStats(pool, res);
    if (action === 'competitors') return await handleCompetitors(pool, req.query, res);

    return res.status(404).json({ error: 'Unknown approvals route', available: ['search', 'stats', 'competitors'] });
  } catch (err) {
    console.error('[approvals]', err.message);
    return res.status(500).json({ error: 'Failed to process approvals request' });
  }
}
