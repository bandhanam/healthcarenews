import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { DRUG_REVIEWS, POPULAR_DRUGS, analyzeSentiment } from '../data/drugReviews';
import './DrugSentimentPage.css';

const ACCENT = '#ec4899';
const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];
const SENTIMENT_COLORS = { Positive: '#10b981', Neutral: '#f59e0b', Negative: '#ef4444' };

function StatCard({ icon, label, value, color, sub }) {
  return (
    <motion.div className="ds-stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="ds-stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="ds-stat-body">
        <span className="ds-stat-val">{value}</span>
        <span className="ds-stat-label">{label}</span>
        {sub && <span className="ds-stat-sub">{sub}</span>}
      </div>
    </motion.div>
  );
}

function ReviewCard({ review, sentiment }) {
  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  return (
    <motion.div
      className={`ds-review-card ds-review-${sentiment.label.toLowerCase()}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="ds-review-header">
        <span className="ds-review-stars" style={{ color: review.rating >= 4 ? '#10b981' : review.rating >= 3 ? '#f59e0b' : '#ef4444' }}>
          {stars}
        </span>
        <span className={`ds-sentiment-badge ds-sentiment-${sentiment.label.toLowerCase()}`}>
          {sentiment.label}
        </span>
      </div>
      <p className="ds-review-text">{review.text}</p>
      <div className="ds-review-meta">
        <span className="ds-review-condition">{review.condition}</span>
        <span className="ds-review-date">{review.date}</span>
      </div>
    </motion.div>
  );
}

function WordCloud({ words }) {
  const maxCount = Math.max(...words.map((w) => w.count), 1);
  return (
    <div className="ds-word-cloud">
      {words.slice(0, 25).map((w, i) => {
        const size = 0.7 + (w.count / maxCount) * 0.8;
        const opacity = 0.5 + (w.count / maxCount) * 0.5;
        return (
          <span
            key={w.term}
            className="ds-word"
            style={{ fontSize: `${size}rem`, opacity, color: COLORS[i % COLORS.length] }}
          >
            {w.term}
          </span>
        );
      })}
    </div>
  );
}

export default function DrugSentimentPage() {
  const [query, setQuery] = useState('');
  const [drug, setDrug] = useState('');
  const [faersData, setFaersData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('reviews');

  const search = useCallback(async (override) => {
    const q = (override ?? query).trim().toLowerCase();
    if (!q) return;
    if (override) setQuery(override);
    setDrug(q);
    setLoading(true);
    try {
      const r = await fetch(`/api/sentiment/faers?drug=${encodeURIComponent(q)}&limit=100`);
      if (r.ok) {
        const data = await r.json();
        setFaersData(data);
      } else {
        setFaersData(null);
      }
    } catch {
      setFaersData(null);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const reviews = useMemo(() => {
    const key = Object.keys(DRUG_REVIEWS).find((k) => drug.includes(k) || k.includes(drug));
    return key ? DRUG_REVIEWS[key] : [];
  }, [drug]);

  const reviewSentiments = useMemo(() => {
    return reviews.map((r) => ({ review: r, sentiment: analyzeSentiment(r.text) }));
  }, [reviews]);

  const sentimentStats = useMemo(() => {
    const counts = { Positive: 0, Neutral: 0, Negative: 0 };
    reviewSentiments.forEach(({ sentiment }) => { counts[sentiment.label]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value, fill: SENTIMENT_COLORS[name] }));
  }, [reviewSentiments]);

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0;
    return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  }, [reviews]);

  const ratingDist = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => { dist[r.rating]++; });
    return [5, 4, 3, 2, 1].map((rating) => ({ rating: `${rating}★`, count: dist[rating] }));
  }, [reviews]);

  return (
    <div className="ds-page">
      <div className="ds-hero">
        <span className="ds-hero-badge">Patient Insights</span>
        <h1 className="ds-title">Drug Sentiment</h1>
        <p className="ds-subtitle">Analyze patient reviews and FDA adverse event reports. Understand real-world drug experiences.</p>
      </div>

      <div className="ds-search-row">
        <input
          type="text"
          placeholder="Enter drug name (e.g., ozempic, metformin, lexapro)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button type="button" onClick={() => search()} disabled={loading || !query.trim()}>
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      <div className="ds-quick">
        <span>Popular:</span>
        {POPULAR_DRUGS.slice(0, 10).map((d) => (
          <button key={d} type="button" onClick={() => search(d)}>{d}</button>
        ))}
      </div>

      {drug && (
        <motion.div className="ds-results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="ds-drug-header">
            <h2>{drug.charAt(0).toUpperCase() + drug.slice(1)}</h2>
            <span className="ds-drug-subtitle">Patient Sentiment Analysis</span>
          </div>

          <div className="ds-stats-row">
            <StatCard icon="⭐" label="Avg Rating" value={avgRating || 'N/A'} color="#f59e0b" sub={`${reviews.length} reviews`} />
            <StatCard icon="💬" label="Patient Reviews" value={reviews.length} color="#6366f1" />
            <StatCard icon="⚠️" label="FDA Reports" value={faersData?.total?.toLocaleString() || '0'} color="#ef4444" sub="Adverse events" />
            <StatCard icon="📊" label="Top Reaction" value={faersData?.reactions?.[0]?.term || 'N/A'} color="#10b981" />
          </div>

          <div className="ds-tabs">
            <button type="button" className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}>
              Patient Reviews
            </button>
            <button type="button" className={tab === 'faers' ? 'active' : ''} onClick={() => setTab('faers')}>
              FDA Adverse Events
            </button>
          </div>

          <AnimatePresence mode="wait">
            {tab === 'reviews' && (
              <motion.div key="reviews" className="ds-tab-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {reviews.length > 0 ? (
                  <>
                    <div className="ds-charts-row">
                      <div className="ds-chart-card">
                        <h3>Sentiment Distribution</h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={sentimentStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                              {sentimentStats.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="ds-chart-card">
                        <h3>Rating Distribution</h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={ratingDist} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="rating" tick={{ fontSize: 11 }} width={40} />
                            <Tooltip />
                            <Bar dataKey="count" fill={ACCENT} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <h3 className="ds-section-title">Patient Reviews</h3>
                    <div className="ds-reviews-grid">
                      {reviewSentiments.map(({ review, sentiment }, i) => (
                        <ReviewCard key={i} review={review} sentiment={sentiment} />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="ds-empty">No patient reviews found for "{drug}". Try a popular drug like ozempic, metformin, or lexapro.</p>
                )}
              </motion.div>
            )}

            {tab === 'faers' && (
              <motion.div key="faers" className="ds-tab-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {faersData && faersData.total > 0 ? (
                  <>
                    <div className="ds-charts-row">
                      <div className="ds-chart-card">
                        <h3>Top Adverse Reactions</h3>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={faersData.reactions.slice(0, 12)} layout="vertical" margin={{ left: 100 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="term" tick={{ fontSize: 10 }} width={95} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="ds-chart-card">
                        <h3>Outcomes</h3>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie data={faersData.outcomes} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                              {faersData.outcomes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="ds-charts-row">
                      <div className="ds-chart-card ds-span-full">
                        <h3>Reaction Word Cloud</h3>
                        <WordCloud words={faersData.reactions} />
                      </div>
                    </div>

                    <h3 className="ds-section-title">Demographics</h3>
                    <div className="ds-demo-row">
                      <div className="ds-demo-card">
                        <h4>Gender</h4>
                        <div className="ds-demo-bar">
                          <div className="ds-demo-fill male" style={{ width: `${(faersData.demographics.male / (faersData.demographics.male + faersData.demographics.female + faersData.demographics.unknown || 1)) * 100}%` }}>
                            Male {faersData.demographics.male}
                          </div>
                          <div className="ds-demo-fill female" style={{ width: `${(faersData.demographics.female / (faersData.demographics.male + faersData.demographics.female + faersData.demographics.unknown || 1)) * 100}%` }}>
                            Female {faersData.demographics.female}
                          </div>
                        </div>
                      </div>
                      <div className="ds-demo-card">
                        <h4>Age Groups</h4>
                        <div className="ds-age-chips">
                          {Object.entries(faersData.demographics.ageGroups || {}).map(([group, count]) => (
                            <span key={group} className="ds-age-chip">{group}: {count}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <h3 className="ds-section-title">Recent Adverse Event Reports</h3>
                    <div className="ds-events-list">
                      {faersData.events.slice(0, 20).map((e, i) => (
                        <motion.div
                          key={e.id}
                          className={`ds-event-card ${e.serious ? 'ds-serious' : ''}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <div className="ds-event-header">
                            <span className="ds-event-id">#{e.id}</span>
                            {e.serious && <span className="ds-serious-badge">Serious</span>}
                            <span className="ds-event-source">{e.source}</span>
                          </div>
                          <div className="ds-event-reactions">
                            {e.reactions.slice(0, 5).map((r, j) => (
                              <span key={j} className="ds-reaction-chip">{r}</span>
                            ))}
                          </div>
                          {e.seriousReason.length > 0 && (
                            <div className="ds-serious-reasons">
                              {e.seriousReason.map((r, j) => (
                                <span key={j} className="ds-reason-chip">{r}</span>
                              ))}
                            </div>
                          )}
                          <div className="ds-event-meta">
                            <span>{e.country}</span>
                            <span>{e.receiveDate}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="ds-empty">No FDA adverse event reports found for "{drug}". Try a common drug name.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {!drug && (
        <div className="ds-intro">
          <h2>What is Drug Sentiment Analysis?</h2>
          <p>Understand how patients experience medications through:</p>
          <ul>
            <li><strong>Patient Reviews</strong> — Real feedback on effectiveness, side effects, and quality of life</li>
            <li><strong>FDA FAERS Data</strong> — Official adverse event reports submitted to the FDA</li>
            <li><strong>Sentiment Analysis</strong> — AI-powered classification of positive, neutral, and negative experiences</li>
          </ul>
          <p className="ds-disclaimer">This tool is for informational purposes only. Always consult your healthcare provider.</p>
        </div>
      )}
    </div>
  );
}
