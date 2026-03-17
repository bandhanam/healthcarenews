import { getPool } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category = '', q = '', limit = '20' } = req.query;
    const pool = getPool();
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (q.trim()) {
      conditions.push(
        `(drug_name ILIKE $${paramIdx} OR generic_name ILIKE $${paramIdx} OR active_substance ILIKE $${paramIdx} OR manufacturer ILIKE $${paramIdx})`,
      );
      params.push(`%${q.trim()}%`);
      paramIdx++;
    }

    if (category.trim()) {
      conditions.push(`therapeutic_area ILIKE $${paramIdx}`);
      params.push(`%${category.trim()}%`);
      paramIdx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const lim = Math.min(parseInt(limit, 10) || 20, 50);

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

    const ranked = Object.values(mfrMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, lim);

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
  } catch (err) {
    console.error('[approvals/competitors]', err.message);
    return res.status(500).json({ error: 'Failed to fetch competitor data' });
  }
}
