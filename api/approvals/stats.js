import { getPool } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pool = getPool();

    const [bySource, byYear, byArea] = await Promise.all([
      pool.query(
        `SELECT source, COUNT(*) AS count FROM drug_approvals GROUP BY source ORDER BY source`,
      ),
      pool.query(
        `SELECT EXTRACT(YEAR FROM approval_date)::int AS year, source, COUNT(*) AS count
         FROM drug_approvals
         WHERE approval_date IS NOT NULL
         GROUP BY year, source
         ORDER BY year DESC
         LIMIT 200`,
      ),
      pool.query(
        `SELECT therapeutic_area, COUNT(*) AS count
         FROM drug_approvals
         WHERE therapeutic_area IS NOT NULL AND therapeutic_area != ''
         GROUP BY therapeutic_area
         ORDER BY count DESC
         LIMIT 30`,
      ),
    ]);

    const totalCount = bySource.rows.reduce((sum, r) => sum + parseInt(r.count, 10), 0);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({
      totalCount,
      bySource: bySource.rows.map((r) => ({ source: r.source, count: parseInt(r.count, 10) })),
      byYear: byYear.rows.map((r) => ({
        year: r.year,
        source: r.source,
        count: parseInt(r.count, 10),
      })),
      byArea: byArea.rows.map((r) => ({
        area: r.therapeutic_area,
        count: parseInt(r.count, 10),
      })),
    });
  } catch (err) {
    console.error('[approvals/stats]', err.message);
    return res.status(500).json({ error: 'Failed to fetch approval stats' });
  }
}
