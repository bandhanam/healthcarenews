import { getPool } from '../_lib/db.js';

function normalizeSlug(slug) {
  if (Array.isArray(slug)) return slug.filter(Boolean);
  if (typeof slug === 'string' && slug.trim()) return [slug.trim()];
  return [];
}

async function handleByDateRange(pool, query, res) {
  const { startDate, endDate } = query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: 'Missing required query params',
      required: ['startDate', 'endDate'],
      format: 'YYYY-MM-DD',
    });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid date format', required: 'YYYY-MM-DD' });
  }
  if (start > end) {
    return res.status(400).json({ error: 'startDate must be before or equal to endDate' });
  }

  const result = await pool.query('SELECT * FROM get_news_by_date_range($1::date, $2::date)', [startDate, endDate]);
  res.setHeader('Cache-Control', 'public, max-age=180, stale-while-revalidate=60');
  return res.json({
    count: result.rows.length,
    startDate,
    endDate,
    data: result.rows,
  });
}

async function handleDiseaseDrug(pool, query, res) {
  const limit = Math.min(500, Math.max(1, parseInt(query.limit, 10) || 50));
  const offset = Math.max(0, parseInt(query.offset, 10) || 0);
  const result = await pool.query(
    `SELECT
      id, "source", generated_at, total_articles, category, article_count,
      article_id, headline, summary, full_text, is_healthcare_topic, keywords,
      entities, country, "region", published_at, source_name, source_url,
      sentiment, confidence_level, forecast_signals, inserted_at, rowid,
      companies, diseases, drugs, rowid_1,
      COUNT(*) OVER() AS _total_count
     FROM public.mv_health_diesease_drug_news
     ORDER BY published_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  const total = result.rows.length > 0 ? parseInt(result.rows[0]._total_count || 0, 10) : 0;
  const articles = result.rows.map(({ _total_count, ...row }) => row);

  res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
  return res.json({
    count: articles.length,
    total,
    limit,
    offset,
    articles,
    data: articles,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const [action] = normalizeSlug(req.query.slug);
  const pool = getPool();

  try {
    if (action === 'by-date-range') return await handleByDateRange(pool, req.query, res);
    if (action === 'disease-drug') return await handleDiseaseDrug(pool, req.query, res);

    return res.status(404).json({ error: 'Unknown news route', available: ['by-date-range', 'disease-drug'] });
  } catch (err) {
    console.error('[news]', err.message);
    return res.status(500).json({ error: 'Database error', message: err.message });
  }
}
