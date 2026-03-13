import { getPool } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { startDate, endDate } = req.query;

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

  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM get_news_by_date_range($1::date, $2::date)',
      [startDate, endDate]
    );

    res.setHeader('Cache-Control', 'public, max-age=180, stale-while-revalidate=60');
    res.json({
      count: result.rows.length,
      startDate,
      endDate,
      data: result.rows,
    });
  } catch (err) {
    console.error('DB error (by-date-range):', err.message);
    res.status(500).json({ error: 'Database error', message: err.message });
  }
}
