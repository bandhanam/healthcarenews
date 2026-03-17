import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import './DrugTimelinePage.css';

const Q = ['#059669','#10b981','#34d399','#6ee7b7','#a7f3d0','#0d9488','#14b8a6','#2dd4bf','#5eead4','#99f6e4'];
const PHASE_COLORS = { 'EARLY_PHASE1': '#f97316', 'PHASE1': '#f59e0b', 'PHASE2': '#3b82f6', 'PHASE3': '#10b981', 'PHASE4': '#8b5cf6', 'NA': '#94a3b8' };
const STATUS_COLORS = { RECRUITING: '#10b981', ACTIVE_NOT_RECRUITING: '#3b82f6', COMPLETED: '#8b5cf6', NOT_YET_RECRUITING: '#f59e0b', TERMINATED: '#ef4444', WITHDRAWN: '#94a3b8' };

const POPULAR = [
  { label: 'Ozempic', q: 'semaglutide' },
  { label: 'Keytruda', q: 'pembrolizumab' },
  { label: 'Humira', q: 'adalimumab' },
  { label: 'Metformin', q: 'metformin' },
  { label: 'Remdesivir', q: 'remdesivir' },
  { label: 'Dupixent', q: 'dupilumab' },
];

function phaseLabel(p) {
  return (p || '').replace('EARLY_PHASE1', 'Early Phase 1').replace('PHASE', 'Phase ').replace('NA', 'N/A');
}
function statusLabel(s) {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function TimelineSVG({ milestones }) {
  if (!milestones?.length) return null;
  const sorted = [...milestones].sort((a, b) => (a.year || 0) - (b.year || 0));
  const width = 800;
  const height = 160;
  const marginX = 60;
  const lineY = 80;
  const spacing = sorted.length > 1 ? (width - 2 * marginX) / (sorted.length - 1) : 0;

  return (
    <div className="dt-timeline-svg-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="dt-timeline-svg">
        <defs>
          <linearGradient id="tlGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
        <line x1={marginX} y1={lineY} x2={width - marginX} y2={lineY} stroke="url(#tlGrad)" strokeWidth="3" strokeLinecap="round" />
        {sorted.map((m, i) => {
          const cx = sorted.length === 1 ? width / 2 : marginX + i * spacing;
          const above = i % 2 === 0;
          return (
            <g key={i}>
              <line x1={cx} y1={lineY - 12} x2={cx} y2={lineY + 12} stroke="var(--color-border, #e2e8f0)" strokeWidth="1" />
              <circle cx={cx} cy={lineY} r={10} fill={m.color} stroke="#fff" strokeWidth="2.5" />
              <text x={cx} y={lineY + (above ? -22 : 30)} textAnchor="middle" fontSize="10" fontWeight="700" fill={m.color}>
                {m.label}
              </text>
              <text x={cx} y={lineY + (above ? -34 : 42)} textAnchor="middle" fontSize="8.5" fill="var(--color-text-dim, #94a3b8)">
                {m.year || ''}
              </text>
              <text x={cx} y={lineY + (above ? -46 : 54)} textAnchor="middle" fontSize="7.5" fill="var(--color-text-dim, #94a3b8)">
                {m.count ? `${m.count} trials` : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <motion.div className="dt-stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="dt-stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="dt-stat-body">
        <span className="dt-stat-val">{value}</span>
        <span className="dt-stat-label">{label}</span>
        {sub && <span className="dt-stat-sub">{sub}</span>}
      </div>
    </motion.div>
  );
}

function ChartCard({ title, children, className = '' }) {
  return (
    <motion.div className={`dt-chart-card ${className}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <h3 className="dt-chart-title">{title}</h3>
      {children}
    </motion.div>
  );
}

function DrugTimelinePage() {
  const [query, setQuery] = useState('');
  const [drugName, setDrugName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trials, setTrials] = useState([]);
  const [approvals, setApprovals] = useState([]);

  const search = useCallback(async (q) => {
    if (!q.trim()) return;
    setDrugName(q.trim());
    setLoading(true);
    setError('');
    setTrials([]);
    setApprovals([]);

    try {
      const [trialsRes, approvalsRes] = await Promise.allSettled([
        fetch(`/api/trials/search?condition=${encodeURIComponent(q)}&pageSize=50`).then(r => r.ok ? r.json() : null),
        fetch(`/api/approvals/search?query=${encodeURIComponent(q)}`).then(r => r.ok ? r.json() : null),
      ]);

      const trialsData = trialsRes.status === 'fulfilled' && trialsRes.value?.studies ? trialsRes.value.studies : [];
      const approvalsData = approvalsRes.status === 'fulfilled' && approvalsRes.value?.results ? approvalsRes.value.results : [];

      if (trialsData.length === 0 && approvalsData.length === 0) {
        setError(`No data found for "${q}". Try a generic drug name like "semaglutide" or "metformin".`);
      }

      setTrials(trialsData);
      setApprovals(approvalsData);
    } catch {
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    search(query);
  }, [query, search]);

  const phaseDistribution = useMemo(() => {
    const map = {};
    trials.forEach((t) => {
      const phases = t.protocolSection?.designModule?.phases || ['NA'];
      phases.forEach((p) => { map[p] = (map[p] || 0) + 1; });
    });
    return Object.entries(map).map(([k, v]) => ({ name: phaseLabel(k), value: v, key: k })).sort((a, b) => b.value - a.value);
  }, [trials]);

  const statusDistribution = useMemo(() => {
    const map = {};
    trials.forEach((t) => {
      const s = t.protocolSection?.statusModule?.overallStatus || 'UNKNOWN';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([k, v]) => ({ name: statusLabel(k), value: v, key: k })).sort((a, b) => b.value - a.value);
  }, [trials]);

  const enrollmentByPhase = useMemo(() => {
    const map = {};
    trials.forEach((t) => {
      const phases = t.protocolSection?.designModule?.phases || ['NA'];
      const enroll = t.protocolSection?.designModule?.enrollmentInfo?.count || 0;
      phases.forEach((p) => {
        if (!map[p]) map[p] = { phase: phaseLabel(p), total: 0, count: 0 };
        map[p].total += enroll;
        map[p].count += 1;
      });
    });
    return Object.values(map).map(d => ({ ...d, avg: d.count > 0 ? Math.round(d.total / d.count) : 0 }));
  }, [trials]);

  const yearlyTrials = useMemo(() => {
    const map = {};
    trials.forEach((t) => {
      const dateStr = t.protocolSection?.statusModule?.startDateStruct?.date;
      if (!dateStr) return;
      const year = parseInt(dateStr.substring(0, 4));
      if (!isNaN(year) && year > 1990) map[year] = (map[year] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a - b).map(([year, count]) => ({ year: String(year), trials: count }));
  }, [trials]);

  const sponsorData = useMemo(() => {
    const map = {};
    trials.forEach((t) => {
      const org = t.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || 'Unknown';
      map[org] = (map[org] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name: name.length > 30 ? name.substring(0, 27) + '...' : name, count }));
  }, [trials]);

  const milestones = useMemo(() => {
    const phaseYears = {};
    trials.forEach((t) => {
      const dateStr = t.protocolSection?.statusModule?.startDateStruct?.date;
      const phases = t.protocolSection?.designModule?.phases || [];
      if (!dateStr || !phases.length) return;
      const year = parseInt(dateStr.substring(0, 4));
      if (isNaN(year)) return;
      phases.forEach((p) => {
        if (!phaseYears[p]) phaseYears[p] = { minYear: year, count: 0 };
        if (year < phaseYears[p].minYear) phaseYears[p].minYear = year;
        phaseYears[p].count++;
      });
    });

    const appYear = approvals.length > 0 ? approvals.reduce((mn, a) => {
      const yr = a.approval_date ? new Date(a.approval_date).getFullYear() : 9999;
      return yr < mn ? yr : mn;
    }, 9999) : null;

    const ms = Object.entries(phaseYears).map(([p, d]) => ({
      label: phaseLabel(p),
      year: d.minYear,
      count: d.count,
      color: PHASE_COLORS[p] || '#94a3b8',
    }));
    if (appYear && appYear < 9999) {
      ms.push({ label: 'Approved', year: appYear, count: approvals.length, color: '#10b981' });
    }
    return ms.sort((a, b) => a.year - b.year);
  }, [trials, approvals]);

  const regionData = useMemo(() => {
    const map = {};
    approvals.forEach((a) => {
      const r = a.regulatory_body || 'Other';
      map[r] = (map[r] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [approvals]);

  const totalEnrollment = useMemo(() => {
    return trials.reduce((s, t) => s + (t.protocolSection?.designModule?.enrollmentInfo?.count || 0), 0);
  }, [trials]);

  const hasData = trials.length > 0 || approvals.length > 0;

  return (
    <div className="dt-page">
      <div className="dt-hero">
        <span className="dt-hero-badge">DrugTimeline</span>
        <h1 className="dt-title">Drug Lifecycle Visualizer</h1>
        <p className="dt-subtitle">Trace a drug's complete journey from clinical trials to market approval with interactive timelines</p>
      </div>

      <form className="dt-search-card" onSubmit={handleSubmit}>
        <div className="dt-search-bar">
          <svg className="dt-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input className="dt-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter drug name (e.g., semaglutide, pembrolizumab)..." />
          <button type="submit" className={`dt-search-btn ${query.trim() ? 'active' : ''}`} disabled={!query.trim() || loading}>
            {loading ? <div className="dt-btn-spin" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            )}
          </button>
        </div>
        <div className="dt-quick-picks">
          <span className="dt-qp-label">Popular:</span>
          {POPULAR.map((p) => (
            <button key={p.q} type="button" className="dt-qp-btn" onClick={() => { setQuery(p.q); search(p.q); }}>{p.label}</button>
          ))}
        </div>
      </form>

      {error && <div className="dt-error-msg">{error}</div>}

      {loading && (
        <div className="dt-loading">
          <div className="dt-pulse-wrap"><div className="dt-pulse" /><div className="dt-pulse dt-p2" /><span style={{ fontSize: '1.3rem' }}>{'\uD83D\uDD2C'}</span></div>
          <p>Tracing <strong>{drugName}</strong> lifecycle...</p>
        </div>
      )}

      <AnimatePresence>
        {hasData && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="dt-drug-banner">
              <h2>Lifecycle of <span>{drugName}</span></h2>
            </div>

            <div className="dt-stats-row">
              <StatCard icon={'\uD83E\uDDEA'} label="Clinical Trials" value={trials.length.toLocaleString()} color="#059669" />
              <StatCard icon={'\u2705'} label="Approvals" value={approvals.length.toLocaleString()} color="#10b981" />
              <StatCard icon={'\uD83D\uDC65'} label="Total Enrolled" value={totalEnrollment.toLocaleString()} color="#14b8a6" />
              <StatCard icon={'\uD83D\uDCC5'} label="Year Span" value={yearlyTrials.length > 0 ? `${yearlyTrials[0]?.year}–${yearlyTrials[yearlyTrials.length - 1]?.year}` : '-'} color="#0d9488" />
            </div>

            {milestones.length > 0 && (
              <ChartCard title="Drug Development Timeline" className="dt-span-full">
                <TimelineSVG milestones={milestones} />
              </ChartCard>
            )}

            <div className="dt-charts-grid">
              {yearlyTrials.length > 0 && (
                <ChartCard title="Trials Over Time" className="dt-span-full">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={yearlyTrials} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="dtAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Area type="monotone" dataKey="trials" stroke="#059669" fill="url(#dtAreaGrad)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {phaseDistribution.length > 0 && (
                <ChartCard title="Phase Distribution">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={phaseDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {phaseDistribution.map((d, i) => <Cell key={i} fill={PHASE_COLORS[d.key] || Q[i % Q.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {statusDistribution.length > 0 && (
                <ChartCard title="Trial Status Breakdown">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {statusDistribution.map((d, i) => <Cell key={i} fill={STATUS_COLORS[d.key] || Q[i % Q.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {enrollmentByPhase.length > 0 && (
                <ChartCard title="Avg Enrollment by Phase" className="dt-span-full">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={enrollmentByPhase} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis dataKey="phase" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Bar dataKey="avg" name="Avg Enrollment" radius={[6, 6, 0, 0]}>
                        {enrollmentByPhase.map((d, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Bar>
                      <Bar dataKey="count" name="Trial Count" radius={[6, 6, 0, 0]}>
                        {enrollmentByPhase.map((_, i) => <Cell key={i} fill="#14b8a620" stroke="#14b8a6" strokeWidth={1} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {sponsorData.length > 0 && (
                <ChartCard title="Top Sponsors" className="dt-span-full">
                  <ResponsiveContainer width="100%" height={Math.max(160, sponsorData.length * 28)}>
                    <BarChart data={sponsorData} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text, #1e293b)' }} width={115} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Bar dataKey="count" name="Trials" radius={[0, 6, 6, 0]}>
                        {sponsorData.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {regionData.length > 0 && (
                <ChartCard title="Approval Regions">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={regionData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {regionData.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DrugTimelinePage;
