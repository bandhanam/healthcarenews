import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import './GenericLaunchTrackerPage.css';

const ACCENT = '#7c3aed';
const ACCENT_LIGHT = '#a78bfa';

function StatCard({ icon, label, value, color }) {
  return (
    <motion.div className="glt-stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="glt-stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="glt-stat-body">
        <span className="glt-stat-val">{value}</span>
        <span className="glt-stat-label">{label}</span>
      </div>
    </motion.div>
  );
}

export default function GenericLaunchTrackerPage() {
  const [generics, setGenerics] = useState([]);
  const [patents, setPatents] = useState([]);
  const [cliffs, setCliffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [genRes, patRes, cliffRes] = await Promise.all([
        fetch(`/api/orange-book?view=generics&limit=150`),
        fetch(`/api/orange-book?view=patents&limit=100`),
        fetch(`/api/orange-book?view=cliffs&limit=80`),
      ]);
      const genData = genRes.ok ? await genRes.json() : {};
      const patData = patRes.ok ? await patRes.json() : {};
      const cliffData = cliffRes.ok ? await cliffRes.json() : {};
      setGenerics(genData.generics || []);
      setPatents(patData.patents || []);
      setCliffs(cliffData.cliffs || []);
    } catch (e) {
      setError(e.message || 'Failed to load Orange Book data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredGenerics = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return generics;
    return generics.filter(
      (x) =>
        (x.trade_name || '').toLowerCase().includes(q) ||
        (x.ingredient || '').toLowerCase().includes(q) ||
        (x.applicant || '').toLowerCase().includes(q)
    );
  }, [generics, search]);

  const byIngredient = useMemo(() => {
    const m = {};
    filteredGenerics.forEach((g) => {
      const ing = g.ingredient || 'Unknown';
      m[ing] = (m[ing] || 0) + 1;
    });
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({ name: name.slice(0, 20), count }));
  }, [filteredGenerics]);

  const teCodePie = useMemo(() => {
    const m = {};
    filteredGenerics.forEach((g) => {
      const t = g.te_code || 'N/A';
      m[t] = (m[t] || 0) + 1;
    });
    const colors = ['#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe'];
    return Object.entries(m).map(([name, value], i) => ({ name, value, fill: colors[i % colors.length] }));
  }, [filteredGenerics]);

  if (loading && !generics.length) {
    return (
      <div className="glt-page">
        <div className="glt-hero">
          <span className="glt-hero-badge">FDA Orange Book</span>
          <h1 className="glt-title">Generic Launch Tracker</h1>
          <p className="glt-subtitle">ANDA pipeline, approved generics, first-to-file status, and launch dates</p>
        </div>
        <div className="glt-loading">
          <div className="glt-pulse-wrap">
            <div className="glt-pulse" />
            <div className="glt-pulse glt-p2" />
          </div>
          <p>Loading Orange Book data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glt-page">
      <div className="glt-hero">
        <span className="glt-hero-badge">FDA Orange Book</span>
        <h1 className="glt-title">Generic Launch Tracker</h1>
        <p className="glt-subtitle">ANDA pipeline, approved generics, first-to-file status, and launch dates</p>
      </div>

      {error && (
        <motion.div className="glt-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {error}
        </motion.div>
      )}

      <div className="glt-search-row">
        <input
          type="text"
          placeholder="Search by drug, ingredient, or applicant…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
        />
        <button type="button" onClick={() => setSearch(searchInput)}>Search</button>
      </div>

      <div className="glt-stats-row">
        <StatCard icon="💊" label="Approved Generics" value={filteredGenerics.length} color={ACCENT} />
        <StatCard icon="📜" label="Patents" value={patents.length} color="#6366f1" />
        <StatCard icon="📅" label="Patent Cliffs" value={cliffs.length} color="#059669" />
      </div>

      <div className="glt-charts-row">
        <div className="glt-chart-card">
          <h3>Generics by Ingredient</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byIngredient} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
              <Tooltip />
              <Bar dataKey="count" fill={ACCENT} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glt-chart-card">
          <h3>Therapeutic Equivalence (TE) Codes</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={teCodePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label />
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <h2 className="glt-section-title">Patent Cliffs — Generic Entry Opportunities</h2>
      <div className="glt-cliffs-grid">
        {cliffs.slice(0, 12).map((c, i) => (
          <motion.div
            key={`${c.nda_number}-${c.patent_number}-${i}`}
            className="glt-cliff-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <div className="glt-cliff-date">{c.patent_expire_date}</div>
            <h4>{c.trade_name || c.ingredient}</h4>
            <p className="glt-cliff-ing">{c.ingredient}</p>
            <p className="glt-cliff-app">{c.applicant}</p>
          </motion.div>
        ))}
      </div>

      <h2 className="glt-section-title">Approved Generics</h2>
      <div className="glt-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Generic Name</th>
              <th>Applicant</th>
              <th>Approval Date</th>
              <th>TE Code</th>
              <th>Innovator NDA</th>
            </tr>
          </thead>
          <tbody>
            {filteredGenerics.slice(0, 60).map((g, i) => (
              <motion.tr key={`${g.nda_number}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.01, 0.4) }}>
                <td><strong>{g.trade_name || g.ingredient}</strong><br /><span className="glt-muted">{g.ingredient}</span></td>
                <td>{g.applicant}</td>
                <td>{g.approval_date}</td>
                <td><code>{g.te_code || '—'}</code></td>
                <td>{g.innovator_nda || '—'}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="glt-footer-note">Data from FDA Orange Book. Updated monthly.</p>
    </div>
  );
}
