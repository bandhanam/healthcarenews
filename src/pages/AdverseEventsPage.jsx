import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import './AdverseEventsPage.css';

const Q = ['#6366f1','#3b82f6','#0ea5e9','#14b8a6','#10b981','#84cc16','#f59e0b','#f97316','#ef4444','#ec4899','#8b5cf6','#a855f7'];
const OUTCOME_COLORS = { Death: '#ef4444', Hospitalization: '#f97316', 'Life-Threatening': '#f59e0b', Disability: '#8b5cf6', Other: '#94a3b8' };
const SEX_MAP = { 0: 'Unknown', 1: 'Male', 2: 'Female' };

const FDA_BASE = 'https://api.fda.gov/drug/event.json';
const POPULAR = [
  { label: 'Ozempic', q: 'ozempic' },
  { label: 'Metformin', q: 'metformin' },
  { label: 'Atorvastatin', q: 'atorvastatin' },
  { label: 'Lisinopril', q: 'lisinopril' },
  { label: 'Ibuprofen', q: 'ibuprofen' },
  { label: 'Warfarin', q: 'warfarin' },
  { label: 'Sertraline', q: 'sertraline' },
  { label: 'Omeprazole', q: 'omeprazole' },
];

async function fdaFetch(search, count, limit = 20) {
  const params = new URLSearchParams({ search, limit: String(limit) });
  if (count) params.set('count', count);
  const res = await fetch(`${FDA_BASE}?${params}`);
  if (!res.ok) return null;
  return res.json();
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <motion.div className="ae-stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="ae-stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="ae-stat-body">
        <span className="ae-stat-val">{value}</span>
        <span className="ae-stat-label">{label}</span>
        {sub && <span className="ae-stat-sub">{sub}</span>}
      </div>
    </motion.div>
  );
}

function ChartCard({ title, children, className = '' }) {
  return (
    <motion.div className={`ae-chart-card ${className}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <h3 className="ae-chart-title">{title}</h3>
      {children}
    </motion.div>
  );
}

function AdverseEventsPage() {
  const [query, setQuery] = useState('');
  const [drugName, setDrugName] = useState('');
  const [loading, setLoading] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [sexData, setSexData] = useState([]);
  const [seriousData, setSeriousData] = useState([]);
  const [totalReports, setTotalReports] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const searchDrug = useCallback(async (drug) => {
    const name = drug.trim();
    if (!name) return;
    setLoading(true);
    setError('');
    setDrugName(name);
    setReactions([]);
    setTimeline([]);
    setSexData([]);
    setSeriousData([]);
    setTotalReports(0);

    const searchQ = `patient.drug.medicinalproduct:"${name}"`;

    try {
      const [reactRes, dateRes, sexRes, seriousRes, countRes] = await Promise.all([
        fdaFetch(searchQ, 'patient.reaction.reactionmeddrapt.exact', 20),
        fdaFetch(searchQ, 'receivedate', 100),
        fdaFetch(searchQ, 'patient.patientsex', 10),
        fdaFetch(searchQ, 'serious', 5),
        fdaFetch(searchQ, null, 1),
      ]);

      if (reactRes?.results) {
        setReactions(reactRes.results.map((r) => ({ name: r.term, count: r.count })));
      }

      if (dateRes?.results) {
        const byYear = {};
        dateRes.results.forEach((r) => {
          const y = r.time?.substring(0, 4);
          if (y) byYear[y] = (byYear[y] || 0) + r.count;
        });
        setTimeline(Object.entries(byYear).sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count })));
      }

      if (sexRes?.results) {
        setSexData(sexRes.results.map((r) => ({ name: SEX_MAP[r.term] || `Sex ${r.term}`, value: r.count })));
      }

      if (seriousRes?.results) {
        setSeriousData(seriousRes.results.map((r) => ({
          name: r.term === 1 ? 'Serious' : 'Non-Serious',
          value: r.count,
        })));
      }

      if (countRes?.meta?.results?.total) {
        setTotalReports(countRes.meta.results.total);
      }

      if (!reactRes?.results && !dateRes?.results) {
        setError(`No adverse event data found for "${name}". Try the brand or generic name.`);
      }
    } catch {
      setError('Failed to fetch FDA data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    searchDrug(query);
  }, [query, searchDrug]);

  const seriousCount = useMemo(() => {
    const s = seriousData.find((d) => d.name === 'Serious');
    return s ? s.value : 0;
  }, [seriousData]);

  const seriousPct = totalReports > 0 ? Math.round((seriousCount / totalReports) * 100) : 0;
  const topReaction = reactions.length > 0 ? reactions[0].name : '--';
  const hasResults = reactions.length > 0 || timeline.length > 0;

  return (
    <div className="ae-page">
      <motion.div className="ae-hero" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="ae-hero-badge">SafetyWatch</div>
        <h1 className="ae-title">Adverse Event Monitor</h1>
        <p className="ae-subtitle">Real-time FDA adverse event reports (FAERS). Search any drug to see safety signals, reactions, and demographics.</p>
      </motion.div>

      <motion.form className="ae-search-card" onSubmit={handleSubmit} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="ae-search-bar">
          <svg className="ae-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            ref={inputRef}
            className="ae-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a drug (e.g., Ozempic, Metformin, Aspirin)..."
          />
          <button className={`ae-search-btn ${query.trim() ? 'active' : ''}`} type="submit" disabled={!query.trim() || loading}>
            {loading ? <span className="ae-btn-spin" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>}
          </button>
        </div>
        <div className="ae-quick-picks">
          <span className="ae-qp-label">Popular:</span>
          {POPULAR.map((p) => (
            <button key={p.q} type="button" className="ae-qp-btn" onClick={() => { setQuery(p.q); searchDrug(p.q); }}>{p.label}</button>
          ))}
        </div>
      </motion.form>

      {error && !loading && (
        <motion.div className="ae-error-msg" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span>{error}</span>
        </motion.div>
      )}

      {loading && (
        <motion.div className="ae-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="ae-pulse-wrap"><div className="ae-pulse" /><div className="ae-pulse ae-p2" /></div>
          <p>Querying FDA FAERS database for <strong>{drugName}</strong>...</p>
        </motion.div>
      )}

      <AnimatePresence>
        {hasResults && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="ae-drug-banner">
              <h2>Safety Profile: <span>{drugName}</span></h2>
            </div>

            <div className="ae-stats-row">
              <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} label="Total Reports" value={totalReports.toLocaleString()} color="#3b82f6" />
              <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} label="Serious Events" value={`${seriousPct}%`} sub={`${seriousCount.toLocaleString()} reports`} color="#ef4444" />
              <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>} label="Top Reaction" value={topReaction} color="#f59e0b" />
              <StatCard icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>} label="Reactions Tracked" value={reactions.length} color="#8b5cf6" />
            </div>

            <div className="ae-charts-grid">
              {timeline.length > 0 && (
                <ChartCard title="Reports Over Time" className="ae-span-full">
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={timeline}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                      <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fill="url(#areaGrad)" name="Reports" />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {reactions.length > 0 && (
                <ChartCard title="Top Adverse Reactions">
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={reactions.slice(0, 12)} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Reports">
                        {reactions.slice(0, 12).map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              <div className="ae-mini-charts">
                {seriousData.length > 0 && (
                  <ChartCard title="Seriousness Breakdown">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={seriousData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={3}>
                          {seriousData.map((d, i) => <Cell key={i} fill={d.name === 'Serious' ? '#ef4444' : '#10b981'} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {sexData.length > 0 && (
                  <ChartCard title="Patient Demographics">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={sexData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={3}>
                          {sexData.map((_, i) => <Cell key={i} fill={['#3b82f6', '#ec4899', '#94a3b8'][i] || '#94a3b8'} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}
              </div>
            </div>

            {reactions.length > 0 && (
              <div className="ae-reactions-table-section">
                <h3>All Reported Reactions</h3>
                <div className="ae-reactions-grid">
                  {reactions.map((r, i) => {
                    const maxCount = reactions[0].count;
                    const pct = Math.round((r.count / maxCount) * 100);
                    return (
                      <div key={i} className="ae-reaction-row">
                        <span className="ae-rx-rank">#{i + 1}</span>
                        <span className="ae-rx-name">{r.name}</span>
                        <div className="ae-rx-bar-wrap">
                          <div className="ae-rx-bar" style={{ width: `${pct}%`, background: Q[i % Q.length] }} />
                        </div>
                        <span className="ae-rx-count">{r.count.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="ae-disclaimer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>Data from FDA Adverse Event Reporting System (FAERS). Reports do not establish causation. Always consult your healthcare provider.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdverseEventsPage;
