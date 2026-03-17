import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useArticlesContext } from '../context/ArticlesContext';
import { DISEASE_LOGY_MAPPING } from '../data/diseases';
import { CATEGORY_KEYWORDS } from '../data/categories';
import './NewsDigestPage.css';

const TOPIC_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

function extractSummary(text, maxSentences = 3) {
  if (!text) return '';
  const clean = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  return sentences.slice(0, maxSentences).join(' ').trim();
}

function classifyArticleTopic(article) {
  const text = [
    article.title || '',
    article.excerpt || '',
    ...(article.tags || []),
    ...(article.keywords || []),
  ].join(' ').toLowerCase();

  for (const { label, keywords } of DISEASE_LOGY_MAPPING) {
    if (keywords.some((kw) => text.includes(kw))) return label;
  }

  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === 'Other') continue;
    if (kws.some((kw) => text.includes(kw))) return cat.replace(/_/g, ' ');
  }
  return 'General Healthcare';
}

function extractKeywords(articles) {
  const counts = {};
  articles.forEach((a) => {
    const words = [
      ...(a.tags || []),
      ...(a.keywords || []),
      ...(a.drugs || []),
    ];
    words.forEach((w) => {
      if (!w || typeof w !== 'string') return;
      const clean = w.trim().toLowerCase();
      if (clean.length < 3 || ['the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'has'].includes(clean)) return;
      counts[clean] = (counts[clean] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, count]) => ({ word, count }));
}

function BriefingCard({ article, index }) {
  const summary = extractSummary(article.excerpt || article.content);
  const topic = classifyArticleTopic(article);

  return (
    <motion.div
      className="nd-briefing-card"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div className="nd-briefing-rank">#{index + 1}</div>
      <div className="nd-briefing-body">
        <div className="nd-briefing-topic-badge">{topic}</div>
        <h4 className="nd-briefing-title">{article.title}</h4>
        <p className="nd-briefing-summary">{summary}</p>
        <div className="nd-briefing-meta">
          {article.date && <span className="nd-meta-date">{article.date}</span>}
          {article.source && <span className="nd-meta-source">{article.source}</span>}
          {article.country && <span className="nd-meta-country">{article.country}</span>}
        </div>
        {article.url && (
          <a href={article.url} target="_blank" rel="noopener noreferrer" className="nd-briefing-link">
            Read full article
          </a>
        )}
      </div>
    </motion.div>
  );
}

function KeywordCloud({ keywords }) {
  const maxCount = keywords.length > 0 ? keywords[0].count : 1;
  return (
    <div className="nd-keyword-cloud">
      {keywords.map(({ word, count }) => {
        const ratio = count / maxCount;
        const size = 0.7 + ratio * 0.9;
        const opacity = 0.5 + ratio * 0.5;
        return (
          <span
            key={word}
            className="nd-keyword-tag"
            style={{ fontSize: `${size}rem`, opacity }}
          >
            {word}
            <span className="nd-keyword-count">{count}</span>
          </span>
        );
      })}
    </div>
  );
}

function NewsDigestPage() {
  const { articles, loading } = useArticlesContext();

  const sorted = useMemo(
    () => [...articles].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    [articles],
  );

  const topArticles = sorted.slice(0, 8);

  const topicDistribution = useMemo(() => {
    const counts = {};
    sorted.forEach((a) => {
      const topic = classifyArticleTopic(a);
      counts[topic] = (counts[topic] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [sorted]);

  const trendingKeywords = useMemo(() => extractKeywords(sorted), [sorted]);

  const diseaseGroups = useMemo(() => {
    const groups = {};
    sorted.forEach((a) => {
      const topic = classifyArticleTopic(a);
      if (!groups[topic]) groups[topic] = [];
      if (groups[topic].length < 5) groups[topic].push(a);
    });
    return Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8);
  }, [sorted]);

  const sentimentData = useMemo(() => {
    const counts = { Positive: 0, Negative: 0, Neutral: 0 };
    sorted.forEach((a) => {
      const s = (a.sentiment || '').toLowerCase();
      if (s === 'positive') counts.Positive++;
      else if (s === 'negative') counts.Negative++;
      else counts.Neutral++;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [sorted]);

  const sentimentColors = { Positive: '#22c55e', Negative: '#ef4444', Neutral: '#94a3b8' };

  if (loading) {
    return <div className="nd-loading">Loading news digest...</div>;
  }

  return (
    <div className="nd-page">
      <motion.div
        className="nd-hero"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="nd-title">PharmaNews AI Digest</h1>
        <p className="nd-subtitle">
          AI-powered analysis of {sorted.length} healthcare articles -- auto-classified by topic, with trending keywords and sentiment analysis.
        </p>
      </motion.div>

      <section className="nd-section">
        <h2 className="nd-section-title">Morning Briefing</h2>
        <p className="nd-section-desc">Top stories with AI-generated summaries</p>
        <div className="nd-briefing-list">
          {topArticles.map((article, i) => (
            <BriefingCard key={article.id || i} article={article} index={i} />
          ))}
        </div>
      </section>

      <div className="nd-charts-row">
        {topicDistribution.length > 0 && (
          <section className="nd-chart-card">
            <h3>Topic Distribution</h3>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={topicDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={45}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {topicDistribution.map((_, i) => (
                    <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </section>
        )}

        {sentimentData.length > 0 && (
          <section className="nd-chart-card">
            <h3>Sentiment Analysis</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={sentimentData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {sentimentData.map((entry, i) => (
                    <Cell key={i} fill={sentimentColors[entry.name] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}
      </div>

      {trendingKeywords.length > 0 && (
        <section className="nd-section">
          <h2 className="nd-section-title">Trending Keywords</h2>
          <p className="nd-section-desc">Most frequently mentioned terms across all articles</p>
          <KeywordCloud keywords={trendingKeywords} />
        </section>
      )}

      {diseaseGroups.length > 0 && (
        <section className="nd-section">
          <h2 className="nd-section-title">By Topic</h2>
          <p className="nd-section-desc">Articles grouped by AI-classified healthcare topic</p>
          <div className="nd-topic-groups">
            {diseaseGroups.map(([topic, arts]) => (
              <div key={topic} className="nd-topic-group">
                <div className="nd-topic-header">
                  <span className="nd-topic-name">{topic}</span>
                  <span className="nd-topic-count">{arts.length} articles</span>
                </div>
                <div className="nd-topic-articles">
                  {arts.map((a, i) => (
                    <div key={a.id || i} className="nd-topic-article">
                      <span className="nd-topic-article-title">{a.title}</span>
                      <span className="nd-topic-article-date">{a.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default NewsDigestPage;
