import { getPool } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      q = '',
      source = '',
      category = '',
      year = '',
      limit = '50',
      offset = '0',
    } = req.query;

    const pool = getPool();
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (q.trim()) {
      conditions.push(
        `(drug_name ILIKE $${paramIdx} OR generic_name ILIKE $${paramIdx} OR active_substance ILIKE $${paramIdx})`,
      );
      params.push(`%${q.trim()}%`);
      paramIdx++;
    }

    if (source) {
      const sources = source.split(',').map((s) => s.trim().toUpperCase());
      conditions.push(`source = ANY($${paramIdx}::text[])`);
      params.push(sources);
      paramIdx++;
    }

    if (category) {
      conditions.push(`therapeutic_area ILIKE $${paramIdx}`);
      params.push(`%${category.trim()}%`);
      paramIdx++;
    }

    if (year) {
      conditions.push(`EXTRACT(YEAR FROM approval_date) = $${paramIdx}`);
      params.push(parseInt(year, 10));
      paramIdx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;

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
      pool.query(dataSql, [...params, lim, off]),
    ]);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json({
      total: parseInt(countRes.rows[0].total, 10),
      limit: lim,
      offset: off,
      results: dataRes.rows,
    });
  } catch (err) {
    console.error('[approvals/search]', err.message);
    return res.status(500).json({ error: 'Failed to query drug approvals' });
  }
}
