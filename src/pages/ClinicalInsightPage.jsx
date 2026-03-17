import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import './ClinicalInsightPage.css';

const Q = ['#65a30d','#84cc16','#a3e635','#bef264','#d9f99d','#4d7c0f','#3f6212','#365314','#22c55e','#10b981'];
const PHASE_COLORS = { 'Phase 1': '#f59e0b', 'Phase 2': '#3b82f6', 'Phase 3': '#10b981', 'Phase 4': '#8b5cf6', 'Early Ph1': '#f97316', 'N/A': '#94a3b8' };
const STATUS_COLORS = { Completed: '#10b981', Recruiting: '#3b82f6', Terminated: '#ef4444', Withdrawn: '#94a3b8', Suspended: '#f97316', 'Active Not Recruiting': '#8b5cf6', 'Not Yet Recruiting': '#f59e0b' };

const CONDITIONS = [
  { label: 'Breast Cancer', q: 'breast cancer' },
  { label: 'Diabetes Type 2', q: 'diabetes type 2' },
  { label: 'Lung Cancer', q: 'lung cancer' },
  { label: "Alzheimer's", q: 'alzheimer disease' },
  { label: 'Heart Failure', q: 'heart failure' },
  { label: 'COVID-19', q: 'COVID-19' },
  { label: 'Depression', q: 'major depression' },
  { label: 'Obesity', q: 'obesity' },
];

function phaseLabel(p) {
  return (p || '').replace('EARLY_PHASE1', 'Early Ph1').replace('PHASE', 'Phase ').replace('NA', 'N/A');
}
function statusLabel(s) {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function FunnelBar({ phase, total, completed, terminated, color }) {
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const failRate = total > 0 ? Math.round((terminated / total) * 100) : 0;
  return (
    <div className="ci-funnel-row">
      <span className="ci-funnel-phase" style={{ color }}>{phase}</span>
      <div className="ci-funnel-bars">
        <div className="ci-funnel-track">
          <motion.div className="ci-funnel-fill" style={{ background: '#10b981' }} initial={{ width: 0 }} animate={{ width: `${successRate}%` }} transition={{ duration: 0.8 }} />
          <motion.div className="ci-funnel-fill ci-funnel-fail" style={{ background: '#ef4444' }} initial={{ width: 0 }} animate={{ width: `${failRate}%` }} transition={{ duration: 0.8, delay: 0.2 }} />
        </div>
        <div className="ci-funnel-labels">
          <span style={{ color: '#10b981' }}>{successRate}% completed</span>
          <span style={{ color: '#ef4444' }}>{failRate}% terminated</span>
        </div>
      </div>
      <span className="ci-funnel-total">{total}</span>
    </div>
  );
}

function ScoreGauge({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const data = [{ value: pct }, { value: 100 - pct }];
  return (
    <div className="ci-gauge">
      <ResponsiveContainer width={110} height={110}>
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={48} startAngle={90} endAngle={-270} paddingAngle={2}>
            <Cell fill={color} />
            <Cell fill="var(--color-border, #e2e8f0)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="ci-gauge-center">
        <span className="ci-gauge-val" style={{ color }}>{Math.round(pct)}%</span>
      </div>
      <span className="ci-gauge-label">{label}</span>
    </div>
  );
}

function ClinicalInsightPage() {
  const [query, setQuery] = useState('');
  const [conditionName, setConditionName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trials, setTrials] = useState([]);

  const search = useCallback(async (q) => {
    if (!q.trim()) return;
    setConditionName(q.trim());
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/trials/search?condition=${encodeURIComponent(q)}&pageSize=100`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const studies = data?.studies || [];
      if (studies.length === 0) setError(`No trials found for "${q}".`);
      setTrials(studies);
    } catch {
      setError('Failed to fetch trial data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    search(query);
  }, [query, search]);

  const phaseData = useMemo(() => {
    const map = {};
    trials.forEach((t) => {
      const phases = t.protocolSection?.designModule?.phases || ['NA'];
      const status = statusLabel(t.protocolSection?.statusModule?.overallStatus || 'UNKNOWN');
      phases.forEach((p) => {
        const label = phaseLabel(p);
        if (!map[label]) map[label] = { total: 0, completed: 0, terminated: 0, recruiting: 0 };
        map[label].total += 1;
        if (status === 'Completed') map[label].completed += 1;
        if (status === 'Terminated' || status === 'Withdrawn') map[label].terminated += 1;
        if (status === 'Recruiting') map[label].recruiting += 1;
      });
    });
    const order = ['Early Ph1', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'N/A'];
    return order.filter(p => map[p]).map(p => ({ phase: p, ...map[p] }));
  }, [trials]);

  const statusData = useMemo(() => {
    const map = {};
    trials.forEach((t) => {
      const s = statusLabel(t.protocolSection?.statusModule?.overallStatus || 'UNKNOWN');
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [trials]);

  const yearlyTrend = useMemo(() => {
    const map = {};
    trials.forEach((t) => {
      const dateStr = t.protocolSection?.statusModule?.startDateStruct?.date;
      if (!dateStr) return;
      const year = parseInt(dateStr.substring(0, 4));
      if (!isNaN(year) && year > 2000) {
        if (!map[year]) map[year] = { started: 0, completed: 0 };
        map[year].started += 1;
        const status = statusLabel(t.protocolSection?.statusModule?.overallStatus || '');
        if (status === 'Completed') map[year].completed += 1;
      }
    });
    return Object.entries(map).sort(([a], [b]) => a - b).map(([year, d]) => ({ year: String(year), ...d }));
  }, [trials]);

  const enrollmentByPhase = useMemo(() => {
    const map = {};
    trials.forEach((t) => {
      const phases = t.protocolSection?.designModule?.phases || ['NA'];
      const enroll = t.protocolSection?.designModule?.enrollmentInfo?.count || 0;
      phases.forEach((p) => {
        const label = phaseLabel(p);
        if (!map[label]) map[label] = { total: 0, count: 0 };
        map[label].total += enroll;
        map[label].count += 1;
      });
    });
    return Object.entries(map).map(([phase, d]) => ({ phase, avg: d.count > 0 ? Math.round(d.total / d.count) : 0, total: d.total }));
  }, [trials]);

  const sponsorData = useMemo(() => {
    const map = {};
    trials.forEach((t) => {
      const org = t.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || 'Unknown';
      map[org] = (map[org] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name: name.length > 25 ? name.substring(0, 22) + '...' : name, count }));
  }, [trials]);

  const totalCompleted = trials.filter(t => statusLabel(t.protocolSection?.statusModule?.overallStatus || '') === 'Completed').length;
  const totalTerminated = trials.filter(t => ['Terminated', 'Withdrawn'].includes(statusLabel(t.protocolSection?.statusModule?.overallStatus || ''))).length;
  const totalRecruiting = trials.filter(t => statusLabel(t.protocolSection?.statusModule?.overallStatus || '') === 'Recruiting').length;
  const completionRate = trials.length > 0 ? Math.round((totalCompleted / trials.length) * 100) : 0;

  return (
    <div className="ci-page">
      <div className="ci-hero">
        <span className="ci-hero-badge">ClinicalInsight</span>
        <h1 className="ci-title">Trial Success Rate Analyzer</h1>
        <p className="ci-subtitle">Deep analytics on clinical trial success rates, phase transitions, and completion metrics</p>
      </div>

      <form className="ci-search-card" onSubmit={handleSubmit}>
        <div className="ci-search-bar">
          <svg className="ci-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input className="ci-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter condition (e.g., breast cancer, diabetes)..." />
          <button type="submit" className={`ci-search-btn ${query.trim() ? 'active' : ''}`} disabled={!query.trim() || loading}>
            {loading ? <div className="ci-btn-spin" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            )}
          </button>
        </div>
        <div className="ci-conditions">
          {CONDITIONS.map((c) => (
            <button key={c.q} type="button" className="ci-cond-btn" onClick={() => { setQuery(c.q); search(c.q); }}>{c.label}</button>
          ))}
        </div>
      </form>

      {error && <div className="ci-error">{error}</div>}
      {loading && (
        <div className="ci-loading">
          <div className="ci-pulse-wrap"><div className="ci-pulse" /><div className="ci-pulse ci-p2" /><span>{'\uD83D\uDCCA'}</span></div>
          <p>Analyzing <strong>{conditionName}</strong> trials...</p>
        </div>
      )}

      <AnimatePresence>
        {trials.length > 0 && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="ci-banner"><h2>Trial Analytics for <span>{conditionName}</span></h2></div>

            <div className="ci-gauges-row">
              <ScoreGauge label="Completion Rate" value={completionRate} max={100} color="#10b981" />
              <ScoreGauge label="Recruiting" value={trials.length > 0 ? Math.round((totalRecruiting / trials.length) * 100) : 0} max={100} color="#3b82f6" />
              <ScoreGauge label="Failure Rate" value={trials.length > 0 ? Math.round((totalTerminated / trials.length) * 100) : 0} max={100} color="#ef4444" />
            </div>

            <div className="ci-stats-row">
              <motion.div className="ci-stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="ci-stat-icon" style={{ background: '#65a30d18', color: '#65a30d' }}>{'\uD83E\uDDEA'}</div>
                <div className="ci-stat-body"><span className="ci-stat-val">{trials.length}</span><span className="ci-stat-label">Total Trials</span></div>
              </motion.div>
              <motion.div className="ci-stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="ci-stat-icon" style={{ background: '#10b98118', color: '#10b981' }}>{'\u2705'}</div>
                <div className="ci-stat-body"><span className="ci-stat-val">{totalCompleted}</span><span className="ci-stat-label">Completed</span></div>
              </motion.div>
              <motion.div className="ci-stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="ci-stat-icon" style={{ background: '#3b82f618', color: '#3b82f6' }}>{'\uD83D\uDD04'}</div>
                <div className="ci-stat-body"><span className="ci-stat-val">{totalRecruiting}</span><span className="ci-stat-label">Recruiting</span></div>
              </motion.div>
              <motion.div className="ci-stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="ci-stat-icon" style={{ background: '#ef444418', color: '#ef4444' }}>{'\u274C'}</div>
                <div className="ci-stat-body"><span className="ci-stat-val">{totalTerminated}</span><span className="ci-stat-label">Failed</span></div>
              </motion.div>
            </div>

            {phaseData.length > 0 && (
              <motion.div className="ci-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h3 className="ci-chart-title">Phase Success Funnel</h3>
                {phaseData.map((d) => (
                  <FunnelBar key={d.phase} phase={d.phase} total={d.total} completed={d.completed} terminated={d.terminated} color={PHASE_COLORS[d.phase] || '#94a3b8'} />
                ))}
              </motion.div>
            )}

            <div className="ci-charts-grid">
              {yearlyTrend.length > 0 && (
                <motion.div className="ci-chart-card ci-span-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="ci-chart-title">Trial Activity Over Time</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={yearlyTrend} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="ciA1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#65a30d" stopOpacity={0.3} /><stop offset="100%" stopColor="#65a30d" stopOpacity={0} /></linearGradient>
                        <linearGradient id="ciA2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                      <Area type="monotone" dataKey="started" name="Started" stroke="#65a30d" fill="url(#ciA1)" strokeWidth={2.5} />
                      <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" fill="url(#ciA2)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {statusData.length > 0 && (
                <motion.div className="ci-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="ci-chart-title">Trial Status</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {statusData.map((d, i) => <Cell key={i} fill={STATUS_COLORS[d.name] || Q[i % Q.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.68rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {enrollmentByPhase.length > 0 && (
                <motion.div className="ci-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="ci-chart-title">Avg Enrollment by Phase</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={enrollmentByPhase} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis dataKey="phase" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Bar dataKey="avg" name="Avg Enrollment" radius={[6, 6, 0, 0]}>
                        {enrollmentByPhase.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {sponsorData.length > 0 && (
                <motion.div className="ci-chart-card ci-span-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="ci-chart-title">Top Sponsors</h3>
                  <ResponsiveContainer width="100%" height={Math.max(160, sponsorData.length * 28)}>
                    <BarChart data={sponsorData} layout="vertical" margin={{ left: 110, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text, #1e293b)' }} width={105} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Bar dataKey="count" name="Trials" radius={[0, 6, 6, 0]}>
                        {sponsorData.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ClinicalInsightPage;
