import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import './ResearchRadarPage.css';

const Q = ['#0284c7','#0ea5e9','#38bdf8','#7dd3fc','#bae6fd','#0369a1','#075985','#0c4a6e','#06b6d4','#14b8a6'];

const NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

const RESEARCH_TOPICS = [
  { label: 'Cancer Immunotherapy', q: 'cancer immunotherapy', icon: '\uD83C\uDF80' },
  { label: 'CRISPR Gene Editing', q: 'CRISPR gene editing', icon: '\uD83E\uDDEC' },
  { label: 'Alzheimer Treatment', q: 'alzheimer treatment', icon: '\uD83E\uDDE0' },
  { label: 'mRNA Vaccines', q: 'mRNA vaccine', icon: '\uD83D\uDC89' },
  { label: 'AI Drug Discovery', q: 'artificial intelligence drug discovery', icon: '\uD83E\uDD16' },
  { label: 'Gut Microbiome', q: 'gut microbiome therapy', icon: '\uD83E\uDDA0' },
  { label: 'CAR-T Cell Therapy', q: 'CAR-T cell therapy', icon: '\uD83E\uDE78' },
  { label: 'GLP-1 Obesity', q: 'GLP-1 receptor agonist obesity', icon: '\uD83D\uDC8A' },
];

async function searchPubMed(term, retmax = 20) {
  const q = encodeURIComponent(term);
  const searchRes = await fetch(`${NCBI_BASE}/esearch.fcgi?db=pubmed&term=${q}&retmax=${retmax}&sort=date&retmode=json`);
  if (!searchRes.ok) return { ids: [], count: 0 };
  const searchData = await searchRes.json();
  const ids = searchData?.esearchresult?.idlist || [];
  const count = parseInt(searchData?.esearchresult?.count || '0', 10);
  return { ids, count };
}

async function fetchSummaries(ids) {
  if (!ids.length) return [];
  const res = await fetch(`${NCBI_BASE}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`);
  if (!res.ok) return [];
  const data = await res.json();
  const result = data?.result || {};
  return ids.map((id) => result[id]).filter(Boolean);
}

async function fetchYearlyTrend(term) {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 9; y <= currentYear; y++) years.push(y);

  const results = await Promise.all(years.map(async (y) => {
    const q = encodeURIComponent(`${term} AND ${y}[pdat]`);
    try {
      const res = await fetch(`${NCBI_BASE}/esearch.fcgi?db=pubmed&term=${q}&rettype=count&retmode=json`);
      if (!res.ok) return { year: String(y), publications: 0 };
      const data = await res.json();
      return { year: String(y), publications: parseInt(data?.esearchresult?.count || '0', 10) };
    } catch {
      return { year: String(y), publications: 0 };
    }
  }));
  return results;
}

function PaperCard({ paper, index }) {
  const [expanded, setExpanded] = useState(false);
  const authors = paper.authors?.map(a => a.name)?.slice(0, 3)?.join(', ') || 'Unknown';
  const journal = paper.fulljournalname || paper.source || 'Unknown';
  const date = paper.pubdate || '';

  return (
    <motion.div className="rr-paper-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <div className="rr-paper-header" onClick={() => setExpanded(!expanded)}>
        <span className="rr-paper-rank">#{index + 1}</span>
        <div className="rr-paper-info">
          <h4>{paper.title}</h4>
          <div className="rr-paper-meta">
            <span className="rr-paper-journal">{journal}</span>
            <span className="rr-paper-date">{date}</span>
          </div>
        </div>
        <svg className={`rr-chevron ${expanded ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
      </div>
      {expanded && (
        <motion.div className="rr-paper-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
          <p className="rr-paper-authors"><strong>Authors:</strong> {authors}{paper.authors?.length > 3 ? ` et al. (+${paper.authors.length - 3})` : ''}</p>
          <a className="rr-paper-link" href={`https://pubmed.ncbi.nlm.nih.gov/${paper.uid}`} target="_blank" rel="noopener noreferrer">
            View on PubMed →
          </a>
        </motion.div>
      )}
    </motion.div>
  );
}

function ResearchRadarPage() {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [papers, setPapers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [yearlyTrend, setYearlyTrend] = useState([]);
  const [multiTopicData, setMultiTopicData] = useState([]);

  const search = useCallback(async (q) => {
    if (!q.trim()) return;
    setTopic(q.trim());
    setLoading(true);
    setError('');

    try {
      const [searchResult, trend] = await Promise.all([
        searchPubMed(q, 15),
        fetchYearlyTrend(q),
      ]);

      if (searchResult.ids.length === 0) {
        setError(`No research found for "${q}". Try a broader medical term.`);
        setPapers([]);
        setTotalCount(0);
        setYearlyTrend([]);
      } else {
        const summaries = await fetchSummaries(searchResult.ids);
        setPapers(summaries);
        setTotalCount(searchResult.count);
        setYearlyTrend(trend);
      }

      const topicCounts = await Promise.all(
        RESEARCH_TOPICS.slice(0, 6).map(async (t) => {
          try {
            const r = await searchPubMed(t.q, 0);
            return { name: t.label.length > 12 ? t.label.substring(0, 10) + '..' : t.label, count: r.count };
          } catch {
            return { name: t.label, count: 0 };
          }
        })
      );
      setMultiTopicData(topicCounts);
    } catch {
      setError('Failed to fetch PubMed data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    search(query);
  }, [query, search]);

  const journalDistribution = useMemo(() => {
    const map = {};
    papers.forEach((p) => {
      const j = p.source || p.fulljournalname || 'Other';
      map[j] = (map[j] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({
      name: name.length > 20 ? name.substring(0, 17) + '...' : name, value,
    }));
  }, [papers]);

  const yearDistribution = useMemo(() => {
    const map = {};
    papers.forEach((p) => {
      const year = p.pubdate?.substring(0, 4) || 'N/A';
      map[year] = (map[year] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a)).map(([name, value]) => ({ name, value }));
  }, [papers]);

  const growthRate = useMemo(() => {
    if (yearlyTrend.length < 2) return null;
    const recent = yearlyTrend[yearlyTrend.length - 1]?.publications || 0;
    const prev = yearlyTrend[yearlyTrend.length - 2]?.publications || 1;
    return Math.round(((recent - prev) / prev) * 100);
  }, [yearlyTrend]);

  return (
    <div className="rr-page">
      <div className="rr-hero">
        <span className="rr-hero-badge">ResearchRadar</span>
        <h1 className="rr-title">Medical Research Trend Analyzer</h1>
        <p className="rr-subtitle">Explore trending PubMed research — publication trends, journal analysis, and latest breakthroughs</p>
      </div>

      <form className="rr-search-card" onSubmit={handleSubmit}>
        <div className="rr-search-bar">
          <svg className="rr-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input className="rr-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search medical research (e.g., mRNA vaccine, CRISPR)..." />
          <button type="submit" className={`rr-search-btn ${query.trim() ? 'active' : ''}`} disabled={!query.trim() || loading}>
            {loading ? <div className="rr-btn-spin" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            )}
          </button>
        </div>
        <div className="rr-topics-grid">
          {RESEARCH_TOPICS.map((t) => (
            <button key={t.q} type="button" className="rr-topic-btn" onClick={() => { setQuery(t.q); search(t.q); }}>
              <span className="rr-topic-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </form>

      {error && <div className="rr-error">{error}</div>}

      {loading && (
        <div className="rr-loading">
          <div className="rr-pulse-wrap"><div className="rr-pulse" /><div className="rr-pulse rr-p2" /><span>{'\uD83D\uDD2C'}</span></div>
          <p>Scanning PubMed for <strong>{topic}</strong>...</p>
        </div>
      )}

      <AnimatePresence>
        {papers.length > 0 && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="rr-result-banner">
              <h2>Research on <span>{topic}</span></h2>
            </div>

            <div className="rr-stats-row">
              <motion.div className="rr-stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="rr-stat-icon" style={{ background: '#0284c718', color: '#0284c7' }}>{'\uD83D\uDCDA'}</div>
                <div className="rr-stat-body"><span className="rr-stat-val">{totalCount.toLocaleString()}</span><span className="rr-stat-label">Total Publications</span></div>
              </motion.div>
              <motion.div className="rr-stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="rr-stat-icon" style={{ background: '#10b98118', color: '#10b981' }}>{'\uD83D\uDCC8'}</div>
                <div className="rr-stat-body"><span className="rr-stat-val">{growthRate !== null ? `${growthRate > 0 ? '+' : ''}${growthRate}%` : '-'}</span><span className="rr-stat-label">YoY Growth</span></div>
              </motion.div>
              <motion.div className="rr-stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="rr-stat-icon" style={{ background: '#8b5cf618', color: '#8b5cf6' }}>{'\uD83C\uDFDB\uFE0F'}</div>
                <div className="rr-stat-body"><span className="rr-stat-val">{journalDistribution.length}</span><span className="rr-stat-label">Journals</span></div>
              </motion.div>
              <motion.div className="rr-stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="rr-stat-icon" style={{ background: '#f59e0b18', color: '#f59e0b' }}>{'\uD83D\uDCC4'}</div>
                <div className="rr-stat-body"><span className="rr-stat-val">{papers.length}</span><span className="rr-stat-label">Showing</span></div>
              </motion.div>
            </div>

            <div className="rr-charts-grid">
              {yearlyTrend.length > 0 && (
                <motion.div className="rr-chart-card rr-span-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="rr-chart-title">Publication Trend (10 Years)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={yearlyTrend} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="rrArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0284c7" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#0284c7" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Area type="monotone" dataKey="publications" stroke="#0284c7" fill="url(#rrArea)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {journalDistribution.length > 0 && (
                <motion.div className="rr-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="rr-chart-title">Top Journals</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={journalDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {journalDistribution.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.68rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {multiTopicData.length > 2 && (
                <motion.div className="rr-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="rr-chart-title">Hot Topics Comparison</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={multiTopicData.map(d => ({ ...d, scaled: Math.min(d.count / 1000, 100) }))}>
                      <PolarGrid stroke="var(--color-border, #e2e8f0)" />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 8.5, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <PolarRadiusAxis tick={{ fontSize: 8 }} />
                      <Radar dataKey="scaled" stroke="#0284c7" fill="#0284c7" fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {multiTopicData.length > 0 && (
                <motion.div className="rr-chart-card rr-span-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="rr-chart-title">Research Volume by Topic</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={multiTopicData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <Tooltip formatter={(v) => [v.toLocaleString(), 'Publications']} contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Bar dataKey="count" name="Publications" radius={[6, 6, 0, 0]}>
                        {multiTopicData.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </div>

            <motion.div className="rr-papers-section" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="rr-section-title">Latest Publications</h3>
              <div className="rr-papers-list">
                {papers.map((p, i) => <PaperCard key={p.uid} paper={p} index={i} />)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ResearchRadarPage;
