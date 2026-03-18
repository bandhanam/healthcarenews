import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import './RegulatoryCalendarPage.css';

const ACCENT = '#0d9488';
const COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];

function EventCard({ item, index }) {
  const isPdufa = item.type === 'PDUFA';
  return (
    <motion.div
      className={`rc-card ${isPdufa ? 'rc-pdufa' : 'rc-advisory'}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="rc-card-date">{item.date}</div>
      <div className="rc-card-type">{item.type}</div>
      <h3 className="rc-card-drug">{item.drug}</h3>
      <p className="rc-card-indication">{item.indication || item.topic}</p>
      <p className="rc-card-sponsor">{item.sponsor || item.drug}</p>
    </motion.div>
  );
}

export default function RegulatoryCalendarPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/regulatory/calendar?limit=50')
      .then((r) => r.json())
      .then((d) => setData(d.items || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return data;
    return data.filter((x) => x.type.toLowerCase().includes(filter.toLowerCase()));
  }, [data, filter]);

  const byMonth = useMemo(() => {
    const m = {};
    filtered.forEach((x) => {
      const key = x.date?.slice(0, 7) || 'N/A';
      m[key] = (m[key] || 0) + 1;
    });
    return Object.entries(m)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }));
  }, [filtered]);

  const pieData = useMemo(() => {
    const types = {};
    filtered.forEach((x) => {
      types[x.type] = (types[x.type] || 0) + 1;
    });
    return Object.entries(types).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));
  }, [filtered]);

  if (loading) {
    return (
      <div className="rc-page">
        <div className="rc-hero">
          <span className="rc-hero-badge">FDA Regulatory</span>
          <h1 className="rc-title">Regulatory Calendar</h1>
          <p className="rc-subtitle">PDUFA dates, advisory committee meetings, and upcoming drug approvals</p>
        </div>
        <div className="rc-loading">
          <div className="rc-pulse-wrap">
            <div className="rc-pulse" />
            <div className="rc-pulse rc-p2" />
          </div>
          <p>Loading regulatory calendar…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rc-page">
      <div className="rc-hero">
        <span className="rc-hero-badge">FDA Regulatory</span>
        <h1 className="rc-title">Regulatory Calendar</h1>
        <p className="rc-subtitle">PDUFA dates, advisory committee meetings, and upcoming drug approvals</p>
      </div>

      <div className="rc-filters">
        {['all', 'PDUFA', 'Advisory'].map((f) => (
          <button
            key={f}
            type="button"
            className={`rc-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All Events' : f}
          </button>
        ))}
      </div>

      <div className="rc-stats-row">
        <div className="rc-stat">
          <span className="rc-stat-val">{filtered.length}</span>
          <span className="rc-stat-label">Upcoming Events</span>
        </div>
        <div className="rc-stat">
          <span className="rc-stat-val">{filtered.filter((x) => x.type === 'PDUFA').length}</span>
          <span className="rc-stat-label">PDUFA Dates</span>
        </div>
        <div className="rc-stat">
          <span className="rc-stat-val">{filtered.filter((x) => x.type === 'Advisory').length}</span>
          <span className="rc-stat-label">Advisory Meetings</span>
        </div>
      </div>

      <div className="rc-charts-row">
        <div className="rc-chart-card">
          <h3>Events by Month</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rc-chart-card">
          <h3>By Type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label />
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <h2 className="rc-section-title">Upcoming Events</h2>
      <div className="rc-cards-grid">
        <AnimatePresence>
          {filtered.map((item, i) => (
            <EventCard key={item.id || `${item.date}-${item.drug}`} item={item} index={i} />
          ))}
        </AnimatePresence>
      </div>

      <p className="rc-footer-note">Curated PDUFA & Advisory Committee data. Update via api/regulatory/calendar.js.</p>
    </div>
  );
}
