const API_BASE = '/api';

function toYMD(d) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mapRowToArticle(row) {
  const dateVal = row.published_at || row.publishedAt || row.date;
  const dateStr = dateVal ? toYMD(dateVal) : toYMD(new Date());
  return {
    id: row.id || row.article_id || null,
    title: row.headline || row.title || '',
    excerpt: row.summary || row.excerpt || row.description || '',
    content: row.full_text || row.fullText || row.content || row.summary || '',
    date: dateStr,
    url: row.source_url || row.sourceUrl || row.url || '',
    source: row.source_name || row.sourceName || row.source || '',
    country: row.country || row.region || '',
    company: row.company ? String(row.company) : '',
    tags: Array.isArray(row.keywords) ? row.keywords : Array.isArray(row.tags) ? row.tags : (row.keywords ? [row.keywords] : []),
    keywords: Array.isArray(row.keywords) ? row.keywords : [],
    drugs: (row.entities && Array.isArray(row.entities.drugs)) ? row.entities.drugs : [],
    sentiment: row.sentiment || '',
    forecastSignals: row.forecast_signals || row.forecastSignals || null,
  };
}

export function getLatestMonthDates() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { startDate: toYMD(start), endDate: toYMD(end) };
}

export async function fetchNewsByDateRange(startDate, endDate) {
  const url = `${API_BASE}/news/by-date-range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  let rawList = Array.isArray(json) ? json : (json.data || json.articles || []);
  const articles = rawList.map(mapRowToArticle).filter((a) => a.title && a.title.trim() !== '');
  return { count: json.count ?? articles.length, articles };
}

export async function fetchDiseaseDrugNews({ limit = 50, offset = 0 } = {}) {
  const url = `${API_BASE}/news/disease-drug?limit=${limit}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  const articles = (data.articles || data.data || []).map((row) => {
    const dateVal = row.published_at || row.publishedAt;
    const dateStr = dateVal ? toYMD(dateVal) : toYMD(new Date());
    return {
      id: row.id || row.article_id,
      title: row.headline || row.title || '',
      excerpt: row.summary || row.excerpt || '',
      content: row.full_text || row.fullText || row.content || '',
      date: dateStr,
      url: row.source_url || row.sourceUrl || row.url || '',
      source: row.source_name || row.sourceName || row.source || '',
      country: row.country || row.region || '',
      category: row.category || '',
      companies: Array.isArray(row.companies) ? row.companies : [],
      diseases: Array.isArray(row.diseases) ? row.diseases : [],
      drugs: Array.isArray(row.drugs) ? row.drugs : [],
      keywords: Array.isArray(row.keywords) ? row.keywords : [],
      sentiment: row.sentiment || '',
      confidenceLevel: row.confidence_level || '',
      forecastSignals: row.forecast_signals || null,
      entities: row.entities || {},
    };
  });
  return { articles, count: articles.length, total: data.total || articles.length, limit: data.limit || limit, offset: data.offset || offset };
}
