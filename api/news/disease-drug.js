import { getPool } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

  try {
    const pool = getPool();
    const query = `
      SELECT 
        id, "source", generated_at, total_articles, category, article_count,
        article_id, headline, summary, full_text, is_healthcare_topic, keywords,
        entities, country, "region", published_at, source_name, source_url,
        sentiment, confidence_level, forecast_signals, inserted_at, rowid,
        companies, diseases, drugs, rowid_1,
        COUNT(*) OVER() AS _total_count
      FROM public.mv_health_diesease_drug_news
      ORDER BY published_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);

    const total = result.rows.length > 0
      ? parseInt(result.rows[0]._total_count || 0, 10)
      : 0;

    const articles = result.rows.map(({ _total_count, ...row }) => row);

    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
    res.json({
      count: articles.length,
      total,
      limit,
      offset,
      articles,
      data: articles,
    });
  } catch (err) {
    console.error('DB error (disease-drug):', err.message);
    res.status(500).json({ error: 'Database error', message: err.message });
  }
}
