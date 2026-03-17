import { getPool } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cid = '', limit = '10' } = req.query;
    if (!cid) return res.status(400).json({ error: 'cid is required' });

    const pool = getPool();
    const lim = Math.min(parseInt(limit, 10) || 10, 30);

    const target = await pool.query('SELECT * FROM pubchem_compounds WHERE cid = $1', [parseInt(cid, 10)]);
    if (target.rows.length === 0) {
      return res.status(404).json({ error: 'Compound not found' });
    }

    const t = target.rows[0];

    const { rows } = await pool.query(`
      SELECT *,
        (
          CASE WHEN molecular_weight IS NOT NULL AND $2::real IS NOT NULL
               THEN 1.0 - LEAST(ABS(molecular_weight - $2::real) / GREATEST($2::real, 1), 1.0)
               ELSE 0 END
          + CASE WHEN xlogp IS NOT NULL AND $3::real IS NOT NULL
                 THEN 1.0 - LEAST(ABS(xlogp - $3::real) / 10.0, 1.0)
                 ELSE 0 END
          + CASE WHEN tpsa IS NOT NULL AND $4::real IS NOT NULL
                 THEN 1.0 - LEAST(ABS(tpsa - $4::real) / GREATEST($4::real, 1), 1.0)
                 ELSE 0 END
          + CASE WHEN hbond_donor IS NOT NULL AND $5::int IS NOT NULL
                 THEN 1.0 - LEAST(ABS(hbond_donor - $5::int)::real / 10.0, 1.0)
                 ELSE 0 END
          + CASE WHEN hbond_acceptor IS NOT NULL AND $6::int IS NOT NULL
                 THEN 1.0 - LEAST(ABS(hbond_acceptor - $6::int)::real / 15.0, 1.0)
                 ELSE 0 END
        ) AS similarity_score
      FROM pubchem_compounds
      WHERE cid != $1
      ORDER BY similarity_score DESC
      LIMIT $7
    `, [parseInt(cid, 10), t.molecular_weight, t.xlogp, t.tpsa, t.hbond_donor, t.hbond_acceptor, lim]);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({
      target: t,
      similar: rows.map(r => ({
        ...r,
        similarity: r.similarity_score ? Math.round((r.similarity_score / 5) * 100) : 0,
      })),
    });
  } catch (err) {
    console.error('[pubchem/similar]', err.message);
    return res.status(500).json({ error: 'Failed to find similar compounds' });
  }
}
