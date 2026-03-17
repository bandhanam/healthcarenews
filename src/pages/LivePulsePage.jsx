import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { useArticlesContext } from '../context/ArticlesContext';
import './LivePulsePage.css';

const Q = ['#e11d48','#f43f5e','#fb7185','#fda4af','#fecdd3','#be123c','#9f1239','#881337','#f97316','#ef4444'];
const CAT_COLORS = { Oncology: '#ef4444', Cardiology: '#3b82f6', Neurology: '#8b5cf6', Immunology: '#f59e0b', Infectious: '#10b981', Genomics: '#ec4899', Pediatrics: '#06b6d4', Surgery: '#f97316', 'Mental Health': '#6366f1', Other: '#94a3b8' };

const STOP_WORDS = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','has','have','had','do','does','did','will','would','could','should','may','might','can','this','that','these','those','it','its','i','you','he','she','we','they','me','my','his','her','our','their','not','no','so','if','as','than','more','also','about','after','new','said','into','over','such','most','all','some','other','each','both','few','many','very','just','even','only','much','any','s','t','re','ve','ll','d','m']);

function classifyCategory(text) {
  const lower = (text || '').toLowerCase();
  const cats = [
    ['Oncology', ['cancer', 'tumor', 'oncolog', 'leukemia', 'lymphoma', 'melanoma', 'carcinoma']],
    ['Cardiology', ['heart', 'cardiac', 'cardiovascular', 'artery', 'blood pressure', 'hypertension']],
    ['Neurology', ['brain', 'neuro', 'alzheimer', 'parkinson', 'stroke', 'epilepsy', 'cognitive']],
    ['Immunology', ['immune', 'autoimmune', 'allerg', 'lupus', 'rheumatoid', 'inflammation']],
    ['Infectious', ['virus', 'bacteria', 'infection', 'covid', 'flu', 'malaria', 'tuberculosis', 'hiv', 'vaccine']],
    ['Genomics', ['gene', 'genome', 'dna', 'rna', 'crispr', 'mutation', 'genetic']],
    ['Mental Health', ['mental', 'depression', 'anxiety', 'psychiatric', 'bipolar', 'schizophrenia']],
  ];
  for (const [cat, keywords] of cats) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return 'Other';
}

function extractKeywords(articles) {
  const freq = {};
  articles.forEach((a) => {
    const words = `${a.title || ''} ${a.description || ''}`.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
    words.forEach((w) => {
      if (w.length > 3 && !STOP_WORDS.has(w)) freq[w] = (freq[w] || 0) + 1;
    });
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([word, count]) => ({ word, count }));
}

function PulseRing({ value, max, color, label, icon }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const data = [{ value: pct }, { value: 100 - pct }];
  return (
    <div className="lp-pulse-ring">
      <ResponsiveContainer width={100} height={100}>
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={33} outerRadius={42} startAngle={90} endAngle={-270} paddingAngle={2}>
            <Cell fill={color} />
            <Cell fill="var(--color-border, #e2e8f0)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="lp-ring-center">
        <span className="lp-ring-icon">{icon}</span>
        <span className="lp-ring-val" style={{ color }}>{value}</span>
      </div>
      <span className="lp-ring-label">{label}</span>
    </div>
  );
}

function NewsTicker({ articles }) {
  const tickerRef = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => prev + 1);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  const displayed = articles.slice(0, 15);

  return (
    <div className="lp-ticker-wrap">
      <span className="lp-ticker-badge">LIVE</span>
      <div className="lp-ticker" ref={tickerRef}>
        <div className="lp-ticker-track" style={{ transform: `translateX(-${offset % (displayed.length * 350)}px)` }}>
          {[...displayed, ...displayed].map((a, i) => (
            <span key={i} className="lp-ticker-item">
              <span className="lp-ticker-dot" />
              {a.title}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function WordCloud({ keywords }) {
  const maxCount = keywords.length > 0 ? keywords[0].count : 1;
  return (
    <div className="lp-word-cloud">
      {keywords.map((k, i) => {
        const size = 0.65 + (k.count / maxCount) * 0.8;
        const opacity = 0.4 + (k.count / maxCount) * 0.6;
        return (
          <motion.span
            key={k.word}
            className="lp-cloud-word"
            style={{ fontSize: `${size}rem`, color: Q[i % Q.length], opacity }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity }}
            transition={{ delay: i * 0.02 }}
          >
            {k.word}
          </motion.span>
        );
      })}
    </div>
  );
}

function LivePulsePage() {
  const { articles, loading: articlesLoading } = useArticlesContext();
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const categoryData = useMemo(() => {
    const map = {};
    articles.forEach((a) => {
      const cat = classifyCategory(`${a.title} ${a.description}`);
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [articles]);

  const hourlyData = useMemo(() => {
    const map = {};
    articles.forEach((a) => {
      if (!a.publishedAt) return;
      const d = new Date(a.publishedAt);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, count]) => ({ date, articles: count }));
  }, [articles]);

  const keywords = useMemo(() => extractKeywords(articles), [articles]);

  const sourceData = useMemo(() => {
    const map = {};
    articles.forEach((a) => {
      const src = a.source?.name || 'Unknown';
      map[src] = (map[src] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name: name.length > 20 ? name.substring(0, 17) + '...' : name, value }));
  }, [articles]);

  const radarData = useMemo(() => {
    return categoryData.slice(0, 8).map(d => ({ ...d, fullMark: Math.max(...categoryData.map(c => c.value), 1) }));
  }, [categoryData]);

  const sentimentProxy = useMemo(() => {
    const positive = ['breakthrough', 'cure', 'promising', 'success', 'improve', 'hope', 'advance', 'approved'];
    const negative = ['death', 'risk', 'danger', 'fail', 'crisis', 'outbreak', 'concern', 'warning'];
    let pos = 0, neg = 0, neutral = 0;
    articles.forEach((a) => {
      const text = `${a.title} ${a.description}`.toLowerCase();
      const hasPos = positive.some(w => text.includes(w));
      const hasNeg = negative.some(w => text.includes(w));
      if (hasPos && !hasNeg) pos++;
      else if (hasNeg && !hasPos) neg++;
      else neutral++;
    });
    return [
      { name: 'Positive', value: pos, color: '#10b981' },
      { name: 'Neutral', value: neutral, color: '#94a3b8' },
      { name: 'Concerning', value: neg, color: '#ef4444' },
    ];
  }, [articles]);

  const totalArticles = articles.length;
  const todayArticles = articles.filter((a) => {
    if (!a.publishedAt) return false;
    const d = new Date(a.publishedAt);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
  }).length;

  return (
    <div className="lp-page">
      <div className="lp-hero">
        <span className="lp-hero-badge">
          <span className="lp-live-dot" />LivePulse
        </span>
        <h1 className="lp-title">Real-Time Health Dashboard</h1>
        <p className="lp-subtitle">Live intelligence feed monitoring global healthcare news, trends, and sentiment</p>
        <div className="lp-clock">{clock.toLocaleTimeString()}</div>
      </div>

      {articles.length > 0 && <NewsTicker articles={articles} />}

      <div className="lp-rings-row">
        <PulseRing value={totalArticles} max={500} color="#e11d48" label="Total Articles" icon={'\uD83D\uDCF0'} />
        <PulseRing value={todayArticles} max={100} color="#f43f5e" label="Today" icon={'\uD83D\uDD25'} />
        <PulseRing value={categoryData.length} max={10} color="#f97316" label="Categories" icon={'\uD83C\uDFAF'} />
        <PulseRing value={sourceData.length} max={20} color="#8b5cf6" label="Sources" icon={'\uD83C\uDF10'} />
      </div>

      {articlesLoading ? (
        <div className="lp-loading">
          <div className="lp-pulse-wrap"><div className="lp-pulse-anim" /><div className="lp-pulse-anim lp-p2" /><span>{'\uD83D\uDCE1'}</span></div>
          <p>Scanning live feeds...</p>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="lp-charts-grid">
              {hourlyData.length > 0 && (
                <motion.div className="lp-chart-card lp-span-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="lp-chart-title">Article Volume (Last 14 Days)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={hourlyData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="lpArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#e11d48" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#e11d48" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Area type="monotone" dataKey="articles" stroke="#e11d48" fill="url(#lpArea)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              <motion.div className="lp-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h3 className="lp-chart-title">Topic Distribution</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {categoryData.map((d, i) => <Cell key={i} fill={CAT_COLORS[d.name] || Q[i % Q.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                    <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div className="lp-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h3 className="lp-chart-title">Sentiment Analysis</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={sentimentProxy} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {sentimentProxy.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                    <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>

              {radarData.length > 2 && (
                <motion.div className="lp-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="lp-chart-title">Category Radar</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--color-border, #e2e8f0)" />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <PolarRadiusAxis tick={{ fontSize: 9 }} />
                      <Radar dataKey="value" stroke="#e11d48" fill="#e11d48" fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {sourceData.length > 0 && (
                <motion.div className="lp-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="lp-chart-title">Top Sources</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={sourceData} layout="vertical" margin={{ left: 70, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text, #1e293b)' }} width={65} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Bar dataKey="value" name="Articles" radius={[0, 6, 6, 0]}>
                        {sourceData.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </div>

            {keywords.length > 0 && (
              <motion.div className="lp-chart-card lp-keywords-section" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h3 className="lp-chart-title">Trending Keywords</h3>
                <WordCloud keywords={keywords} />
              </motion.div>
            )}

            {articles.length > 0 && (
              <motion.div className="lp-recent-section" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h3 className="lp-chart-title">Latest Headlines</h3>
                <div className="lp-headlines-grid">
                  {articles.slice(0, 8).map((a, i) => (
                    <motion.div key={i} className="lp-headline-card" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                      <span className="lp-hl-cat" style={{ color: CAT_COLORS[classifyCategory(`${a.title} ${a.description}`)] || '#94a3b8' }}>
                        {classifyCategory(`${a.title} ${a.description}`)}
                      </span>
                      <h4 className="lp-hl-title">{a.title}</h4>
                      <span className="lp-hl-source">{a.source?.name || 'Unknown'}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export default LivePulsePage;
