import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import './PatentWatchPage.css';

const ACCENT = '#b45309';
const ACCENT_LIGHT = '#f59e0b';

const VIEWS = [
  { id: 'cliffs', label: 'Patent Cliffs', desc: 'Upcoming expirations (next 3 years)' },
  { id: 'patents', label: 'All Patents', desc: 'Patent expiration dates' },
  { id: 'exclusivity', label: 'Exclusivity', desc: 'Exclusivity expiration dates' },
];

function StatCard({ icon, label, value, color }) {
  return (
    <motion.div className="pw-stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="pw-stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="pw-stat-body">
        <span className="pw-stat-val">{value}</span>
        <span className="pw-stat-label">{label}</span>
      </div>
    </motion.div>
  );
}

export default function PatentWatchPage() {
  const [view, setView] = useState('cliffs');
  const [data, setData] = useState({ cliffs: [], patents: [], exclusivities: [], generics: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cliffsRes, patentsRes, exclusRes, genericsRes] = await Promise.all([
        fetch(`/api/orange-book?view=cliffs&limit=100`),
        fetch(`/api/orange-book?view=patents&limit=150`),
        fetch(`/api/orange-book?view=exclusivity&limit=100`),
        fetch(`/api/orange-book?view=generics&limit=100`),
      ]);
      const cliffs = cliffsRes.ok ? (await cliffsRes.json()).cliffs || [] : [];
      const patents = patentsRes.ok ? (await patentsRes.json()).patents || [] : [];
      const exclusivities = exclusRes.ok ? (await exclusRes.json()).exclusivities || [] : [];
      const generics = genericsRes.ok ? (await genericsRes.json()).generics || [] : [];
      setData({ cliffs, patents, exclusivities, generics });
    } catch (e) {
      setError(e.message || 'Failed to load Orange Book data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    const filter = (arr, keys) =>
      arr.filter((x) => keys.some((k) => (x[k] || '').toLowerCase().includes(q)));
    return {
      cliffs: filter(data.cliffs, ['trade_name', 'ingredient', 'applicant']),
      patents: filter(data.patents, ['trade_name', 'ingredient', 'applicant', 'patent_number']),
      exclusivities: filter(data.exclusivities, ['trade_name', 'ingredient', 'applicant']),
      generics: filter(data.generics, ['trade_name', 'ingredient', 'applicant']),
    };
  }, [data, search]);

  const chartData = useMemo(() => {
    const byYear = {};
    [...filtered.cliffs, ...filtered.patents].forEach((p) => {
      const y = p.patent_expire_parsed?.slice(0, 4) || 'N/A';
      byYear[y] = (byYear[y] || 0) + 1;
    });
    return Object.entries(byYear)
      .filter(([k]) => k !== 'N/A')
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [filtered.cliffs, filtered.patents]);

  const pieData = useMemo(() => {
    const types = {};
    filtered.patents.forEach((p) => {
      const t = p.use_code ? 'Use patent' : 'Product/Substance';
      types[t] = (types[t] || 0) + 1;
    });
    const colors = ['#b45309', '#f59e0b', '#fbbf24'];
    return Object.entries(types).map(([name, value], i) => ({ name, value, fill: colors[i % colors.length] }));
  }, [filtered.patents]);

  if (loading && !data.cliffs.length) {
    return (
      <div className="pw-page">
        <div className="pw-hero">
          <span className="pw-hero-badge">FDA Orange Book</span>
          <h1 className="pw-title">PatentWatch</h1>
          <p className="pw-subtitle">Track patent expirations, exclusivity dates, and patent cliffs for blockbuster drugs</p>
        </div>
        <div className="pw-loading">
          <div className="pw-pulse-wrap">
            <div className="pw-pulse" />
            <div className="pw-pulse pg-p2" />
          </div>
          <p>Loading Orange Book data from FDA…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pw-page">
      <div className="pw-hero">
        <span className="pw-hero-badge">FDA Orange Book</span>
        <h1 className="pw-title">PatentWatch</h1>
        <p className="pw-subtitle">Track patent expirations, exclusivity dates, and patent cliffs for blockbuster drugs</p>
      </div>

      {error && (
        <motion.div className="pw-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {error}
        </motion.div>
      )}

      <div className="pw-search-row">
        <input
          type="text"
          placeholder="Search by drug name, ingredient, or applicant…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
        />
        <button type="button" onClick={() => setSearch(searchInput)}>Search</button>
      </div>

      <div className="pw-stats-row">
        <StatCard icon="📅" label="Patent Cliffs" value={filtered.cliffs.length} color={ACCENT} />
        <StatCard icon="📜" label="Patents" value={filtered.patents.length} color="#6366f1" />
        <StatCard icon="🔒" label="Exclusivity" value={filtered.exclusivities.length} color="#059669" />
        <StatCard icon="💊" label="Generics" value={filtered.generics.length} color="#7c3aed" />
      </div>

      <div className="pw-tabs">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`pw-tab ${view === v.id ? 'active' : ''}`}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="pw-charts-row">
        <div className="pw-chart-card">
          <h3>Patents Expiring by Year</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="pw-chart-card">
          <h3>Patent Types</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label />
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'cliffs' && (
          <motion.div key="cliffs" className="pw-table-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <h2>Patent Cliffs (Next 3 Years)</h2>
            <div className="pw-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Drug / Ingredient</th>
                    <th>Applicant</th>
                    <th>Patent</th>
                    <th>Expiration</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.cliffs.slice(0, 50).map((r, i) => (
                    <motion.tr key={`${r.nda_number}-${r.patent_number}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                      <td><strong>{r.trade_name || r.ingredient}</strong><br /><span className="pw-muted">{r.ingredient}</span></td>
                      <td>{r.applicant}</td>
                      <td><code>{r.patent_number}</code></td>
                      <td>{r.patent_expire_date}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
        {view === 'patents' && (
          <motion.div key="patents" className="pw-table-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <h2>All Patents</h2>
            <div className="pw-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Drug / Ingredient</th>
                    <th>Applicant</th>
                    <th>Patent</th>
                    <th>Expiration</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.patents.slice(0, 80).map((r, i) => (
                    <motion.tr key={`${r.nda_number}-${r.patent_number}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.01, 0.5) }}>
                      <td><strong>{r.trade_name || r.ingredient}</strong><br /><span className="pw-muted">{r.ingredient}</span></td>
                      <td>{r.applicant}</td>
                      <td><code>{r.patent_number}</code></td>
                      <td>{r.patent_expire_date}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
        {view === 'exclusivity' && (
          <motion.div key="exclusivity" className="pw-table-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <h2>Exclusivity Expirations</h2>
            <div className="pw-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Drug / Ingredient</th>
                    <th>Applicant</th>
                    <th>Code</th>
                    <th>Expiration</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.exclusivities.slice(0, 50).map((r, i) => (
                    <motion.tr key={`${r.nda_number}-${r.exclusivity_code}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.01, 0.5) }}>
                      <td><strong>{r.trade_name || r.ingredient}</strong><br /><span className="pw-muted">{r.ingredient}</span></td>
                      <td>{r.applicant}</td>
                      <td><code>{r.exclusivity_code}</code></td>
                      <td>{r.exclusivity_date}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="pw-footer-note">Data from FDA Orange Book. Updated monthly.</p>
    </div>
  );
}
