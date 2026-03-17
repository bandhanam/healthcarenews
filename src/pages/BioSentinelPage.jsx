import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import './BioSentinelPage.css';

const Q = ['#d97706','#f59e0b','#fbbf24','#fcd34d','#fde68a','#b45309','#92400e','#78350f','#f97316','#ea580c'];
const PHASE_COLORS = { 'Phase 1': '#f59e0b', 'Phase 2': '#3b82f6', 'Phase 3': '#10b981', 'Phase 4': '#8b5cf6', 'Approved': '#059669', 'Preclinical': '#f97316' };

const COMPANIES = [
  { label: 'Pfizer', q: 'pfizer' },
  { label: 'Novartis', q: 'novartis' },
  { label: 'Roche', q: 'roche' },
  { label: 'Johnson & Johnson', q: 'johnson' },
  { label: 'AstraZeneca', q: 'astrazeneca' },
  { label: 'Merck', q: 'merck' },
  { label: 'GSK', q: 'gsk' },
  { label: 'Sanofi', q: 'sanofi' },
  { label: 'AbbVie', q: 'abbvie' },
  { label: 'Eli Lilly', q: 'lilly' },
];

function phaseLabel(p) {
  return (p || '').replace('EARLY_PHASE1', 'Early Phase 1').replace('PHASE', 'Phase ').replace('NA', 'N/A');
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <motion.div className="bs-stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="bs-stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="bs-stat-body">
        <span className="bs-stat-val">{value}</span>
        <span className="bs-stat-label">{label}</span>
        {sub && <span className="bs-stat-sub">{sub}</span>}
      </div>
    </motion.div>
  );
}

function ChartCard({ title, children, className = '' }) {
  return (
    <motion.div className={`bs-chart-card ${className}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <h3 className="bs-chart-title">{title}</h3>
      {children}
    </motion.div>
  );
}

function PipelineBar({ phase, count, maxCount, color }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="bs-pipe-row">
      <span className="bs-pipe-phase" style={{ color }}>{phase}</span>
      <div className="bs-pipe-bar-wrap">
        <motion.div className="bs-pipe-bar" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
      </div>
      <span className="bs-pipe-count">{count}</span>
    </div>
  );
}

function BioSentinelPage() {
  const [query, setQuery] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trials, setTrials] = useState([]);
  const [approvals, setApprovals] = useState([]);

  const search = useCallback(async (q) => {
    if (!q.trim()) return;
    setCompanyName(q.trim());
    setLoading(true);
    setError('');

    try {
      const [trialsRes, approvalsRes] = await Promise.allSettled([
        fetch(`/api/trials/search?condition=${encodeURIComponent(q)}&pageSize=100`).then(r => r.ok ? r.json() : null),
        fetch(`/api/approvals/competitors?company=${encodeURIComponent(q)}`).then(r => r.ok ? r.json() : null),
      ]);

      const trialsData = trialsRes.status === 'fulfilled' && trialsRes.value?.studies ? trialsRes.value.studies : [];
      const approvalsData = approvalsRes.status === 'fulfilled' && approvalsRes.value?.results ? approvalsRes.value.results : [];

      if (trialsData.length === 0 && approvalsData.length === 0) {
        setError(`No data found for "${q}". Try a major pharma company name.`);
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

  const pipelineData = useMemo(() => {
    const map = {};
    trials.forEach((t) => {
      const phases = t.protocolSection?.designModule?.phases || ['NA'];
      phases.forEach((p) => {
        const label = phaseLabel(p);
        map[label] = (map[label] || 0) + 1;
      });
    });
    const order = ['Early Phase 1', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'N/A'];
    return order.filter(p => map[p]).map(p => ({ phase: p, count: map[p] }));
  }, [trials]);

  const therapeuticAreas = useMemo(() => {
    const map = {};
    trials.forEach((t) => {
      const conditions = t.protocolSection?.conditionsModule?.conditions || [];
      conditions.forEach((c) => {
        const area = c.length > 30 ? c.substring(0, 27) + '...' : c;
        map[area] = (map[area] || 0) + 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [trials]);

  const yearlyActivity = useMemo(() => {
    const map = {};
    trials.forEach((t) => {
      const dateStr = t.protocolSection?.statusModule?.startDateStruct?.date;
      if (!dateStr) return;
      const year = parseInt(dateStr.substring(0, 4));
      if (!isNaN(year) && year > 2000) {
        if (!map[year]) map[year] = { trials: 0, enrolled: 0 };
        map[year].trials += 1;
        map[year].enrolled += t.protocolSection?.designModule?.enrollmentInfo?.count || 0;
      }
    });
    return Object.entries(map).sort(([a], [b]) => a - b).map(([year, d]) => ({ year: String(year), ...d }));
  }, [trials]);

  const statusData = useMemo(() => {
    const map = {};
    trials.forEach((t) => {
      const s = (t.protocolSection?.statusModule?.overallStatus || 'UNKNOWN').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [trials]);

  const regionData = useMemo(() => {
    const map = {};
    approvals.forEach((a) => {
      const r = a.regulatory_body || 'Other';
      map[r] = (map[r] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [approvals]);

  const radarData = useMemo(() => {
    const maxPipe = Math.max(...pipelineData.map(d => d.count), 1);
    return pipelineData.map(d => ({
      phase: d.phase,
      strength: Math.round((d.count / maxPipe) * 100),
    }));
  }, [pipelineData]);

  const drugProducts = useMemo(() => {
    const map = {};
    approvals.forEach((a) => {
      const name = a.drug_name || 'Unknown';
      if (!map[name]) map[name] = { name, regions: new Set(), types: new Set() };
      if (a.regulatory_body) map[name].regions.add(a.regulatory_body);
      if (a.product_type) map[name].types.add(a.product_type);
    });
    return Object.values(map).map(d => ({ ...d, regions: [...d.regions].join(', '), types: [...d.types].join(', ') })).slice(0, 15);
  }, [approvals]);

  const totalEnrollment = trials.reduce((s, t) => s + (t.protocolSection?.designModule?.enrollmentInfo?.count || 0), 0);
  const maxPipeCount = Math.max(...pipelineData.map(d => d.count), 1);
  const hasData = trials.length > 0 || approvals.length > 0;

  return (
    <div className="bs-page">
      <div className="bs-hero">
        <span className="bs-hero-badge">BioSentinel</span>
        <h1 className="bs-title">Pharma Intelligence Hub</h1>
        <p className="bs-subtitle">Deep competitive analysis of pharmaceutical companies — pipeline, trials, approvals & market position</p>
      </div>

      <form className="bs-search-card" onSubmit={handleSubmit}>
        <div className="bs-search-bar">
          <svg className="bs-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input className="bs-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pharma company (e.g., Pfizer, Novartis)..." />
          <button type="submit" className={`bs-search-btn ${query.trim() ? 'active' : ''}`} disabled={!query.trim() || loading}>
            {loading ? <div className="bs-btn-spin" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            )}
          </button>
        </div>
        <div className="bs-company-grid">
          {COMPANIES.map((c) => (
            <button key={c.q} type="button" className="bs-company-btn" onClick={() => { setQuery(c.q); search(c.q); }}>{c.label}</button>
          ))}
        </div>
      </form>

      {error && <div className="bs-error-msg">{error}</div>}

      {loading && (
        <div className="bs-loading">
          <div className="bs-pulse-wrap"><div className="bs-pulse" /><div className="bs-pulse bs-p2" /><span>{'\uD83C\uDFED'}</span></div>
          <p>Analyzing <strong>{companyName}</strong> intelligence...</p>
        </div>
      )}

      <AnimatePresence>
        {hasData && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bs-company-banner">
              <h2><span>{companyName}</span> Intelligence Report</h2>
            </div>

            <div className="bs-stats-row">
              <StatCard icon={'\uD83E\uDDEA'} label="Active Trials" value={trials.length.toLocaleString()} color="#d97706" />
              <StatCard icon={'\u2705'} label="Approved Products" value={approvals.length.toLocaleString()} color="#10b981" />
              <StatCard icon={'\uD83D\uDC65'} label="Total Enrolled" value={totalEnrollment.toLocaleString()} color="#3b82f6" />
              <StatCard icon={'\uD83C\uDF0D'} label="Regions" value={regionData.length.toLocaleString()} color="#8b5cf6" />
            </div>

            {pipelineData.length > 0 && (
              <ChartCard title="Drug Pipeline by Phase" className="bs-span-full">
                <div className="bs-pipeline-visual">
                  {pipelineData.map((d) => (
                    <PipelineBar key={d.phase} phase={d.phase} count={d.count} maxCount={maxPipeCount} color={PHASE_COLORS[d.phase] || '#94a3b8'} />
                  ))}
                </div>
              </ChartCard>
            )}

            <div className="bs-charts-grid">
              {yearlyActivity.length > 0 && (
                <ChartCard title="R&D Activity Over Time" className="bs-span-full">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={yearlyActivity} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="bsArea1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#d97706" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                      <Area type="monotone" dataKey="trials" name="Trials" stroke="#d97706" fill="url(#bsArea1)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {statusData.length > 0 && (
                <ChartCard title="Trial Status">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {statusData.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {radarData.length > 2 && (
                <ChartCard title="Pipeline Strength Radar">
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--color-border, #e2e8f0)" />
                      <PolarAngleAxis dataKey="phase" tick={{ fontSize: 10, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar dataKey="strength" stroke="#d97706" fill="#d97706" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {therapeuticAreas.length > 0 && (
                <ChartCard title="Therapeutic Focus Areas" className="bs-span-full">
                  <ResponsiveContainer width="100%" height={Math.max(180, therapeuticAreas.length * 26)}>
                    <BarChart data={therapeuticAreas} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text, #1e293b)' }} width={115} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Bar dataKey="value" name="Trials" radius={[0, 6, 6, 0]}>
                        {therapeuticAreas.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
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

            {drugProducts.length > 0 && (
              <ChartCard title="Approved Drug Products">
                <div className="bs-products-grid">
                  {drugProducts.map((d, i) => (
                    <motion.div key={d.name} className="bs-product-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <h4 className="bs-prod-name">{d.name}</h4>
                      {d.regions && <span className="bs-prod-meta">{d.regions}</span>}
                      {d.types && <span className="bs-prod-type">{d.types}</span>}
                    </motion.div>
                  ))}
                </div>
              </ChartCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BioSentinelPage;
