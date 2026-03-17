import { getPool } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q = '', cid = '', limit = '20', drug_likeness = '' } = req.query;
    const pool = getPool();
    const conditions = [];
    const params = [];
    let idx = 1;

    if (cid) {
      conditions.push(`cid = $${idx}`);
      params.push(parseInt(cid, 10));
      idx++;
    } else if (q.trim()) {
      conditions.push(`(name ILIKE $${idx} OR iupac_name ILIKE $${idx} OR $${idx + 1} = ANY(synonyms) OR molecular_formula ILIKE $${idx})`);
      params.push(`%${q.trim()}%`, q.trim());
      idx += 2;
    }

    if (drug_likeness === 'true') {
      conditions.push(`drug_likeness = TRUE`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const lim = Math.min(parseInt(limit, 10) || 20, 100);

    const { rows } = await pool.query(`
      SELECT * FROM pubchem_compounds ${where}
      ORDER BY molecular_weight ASC NULLS LAST
      LIMIT $${idx}
    `, [...params, lim]);

    const countRes = await pool.query(`SELECT COUNT(*) AS total FROM pubchem_compounds ${where}`, params);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({
      total: parseInt(countRes.rows[0].total, 10),
      results: rows,
    });
  } catch (err) {
    console.error('[pubchem/search]', err.message);
    return res.status(500).json({ error: 'Failed to search compounds' });
  }
}
