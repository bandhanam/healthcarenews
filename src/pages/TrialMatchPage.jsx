import { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './TrialMatchPage.css';

const Q = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16'];
const PHASE_COLORS = { 'PHASE1': '#f59e0b', 'PHASE2': '#3b82f6', 'PHASE3': '#10b981', 'PHASE4': '#8b5cf6', 'EARLY_PHASE1': '#f97316', 'NA': '#94a3b8' };
const STATUS_COLORS = { RECRUITING: '#10b981', ACTIVE_NOT_RECRUITING: '#3b82f6', COMPLETED: '#8b5cf6', NOT_YET_RECRUITING: '#f59e0b', TERMINATED: '#ef4444', WITHDRAWN: '#94a3b8', SUSPENDED: '#f97316' };

const CONDITIONS = [
  { label: 'Breast Cancer', icon: '\uD83C\uDF80' },
  { label: 'Diabetes Type 2', icon: '\uD83E\uDE78' },
  { label: 'Alzheimer Disease', icon: '\uD83E\uDDE0' },
  { label: "Parkinson's Disease", icon: '\uD83E\uDDE0' },
  { label: 'Lung Cancer', icon: '\uD83E\uDEC1' },
  { label: 'Heart Failure', icon: '\u2764\uFE0F' },
  { label: 'Depression', icon: '\uD83D\uDCAD' },
  { label: 'Rheumatoid Arthritis', icon: '\uD83E\uDDB4' },
  { label: 'COVID-19', icon: '\uD83E\uDDA0' },
  { label: 'Obesity', icon: '\uD83C\uDFCB\uFE0F' },
];

function phaseLabel(arr) {
  if (!arr || arr.length === 0) return 'N/A';
  return arr.map((p) => p.replace('PHASE', 'Phase ').replace('EARLY_', 'Early ')).join(', ');
}

function statusLabel(s) {
  return (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace('Not Yet', 'Not Yet');
}

function FitBounds({ locations }) {
  const map = useMap();
  useMemo(() => {
    if (locations.length === 0) return;
    const bounds = L.latLngBounds(locations.filter((l) => l.lat && l.lng).map((l) => [l.lat, l.lng]));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 5 });
  }, [locations, map]);
  return null;
}

function TrialCard({ trial, index }) {
  const [open, setOpen] = useState(false);
  const phase = trial.phase ? trial.phase[0] : 'NA';
  const statusColor = STATUS_COLORS[trial.status] || '#94a3b8';

  return (
    <motion.div className="tm-trial-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <div className="tm-trial-header" onClick={() => setOpen(!open)}>
        <div className="tm-trial-phase-dot" style={{ background: PHASE_COLORS[phase] || '#94a3b8' }} />
        <div className="tm-trial-info">
          <h4>{trial.title}</h4>
          <div className="tm-trial-meta">
            <span className="tm-trial-id">{trial.nctId}</span>
            <span className="tm-badge" style={{ background: `${statusColor}18`, color: statusColor }}>{statusLabel(trial.status)}</span>
            <span className="tm-badge tm-badge-phase">{phaseLabel(trial.phase)}</span>
            {trial.enrollmentCount && <span className="tm-trial-enroll">{trial.enrollmentCount} participants</span>}
          </div>
        </div>
        <span className={`tm-trial-chevron ${open ? 'open' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className="tm-trial-body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            {trial.summary && <p className="tm-trial-summary">{trial.summary}</p>}
            <div className="tm-trial-details">
              {trial.sponsor && <div><strong>Sponsor:</strong> {trial.sponsor}</div>}
              {trial.conditions?.length > 0 && <div><strong>Conditions:</strong> {trial.conditions.join(', ')}</div>}
              {trial.interventions?.length > 0 && <div><strong>Interventions:</strong> {trial.interventions.map((i) => `${i.name} (${i.type})`).join(', ')}</div>}
              {trial.startDate && <div><strong>Start:</strong> {trial.startDate}</div>}
              {trial.completionDate && <div><strong>Est. Completion:</strong> {trial.completionDate}</div>}
              {trial.locations?.length > 0 && <div><strong>Sites:</strong> {trial.locations.slice(0, 5).map((l) => [l.city, l.country].filter(Boolean).join(', ')).join(' | ')}</div>}
            </div>
            <a className="tm-trial-link" href={`https://clinicaltrials.gov/study/${trial.nctId}`} target="_blank" rel="noopener noreferrer">View on ClinicalTrials.gov</a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TrialMatchPage() {
  const [query, setQuery] = useState('');
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const inputRef = useRef(null);

  const searchTrials = useCallback(async (condition) => {
    const q = condition.trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setTrials([]);

    try {
      const res = await fetch(`/api/trials/search?condition=${encodeURIComponent(q)}&status=recruiting&pageSize=30`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setTrials(data.studies || []);
      setTotalCount(data.totalCount || 0);
      if ((data.studies || []).length === 0) setError('No recruiting trials found. Try a broader condition name.');
    } catch {
      setError('Failed to search trials. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback((e) => { e.preventDefault(); searchTrials(query); }, [query, searchTrials]);

  const allLocations = useMemo(() => trials.flatMap((t) => (t.locations || []).filter((l) => l.lat && l.lng)), [trials]);

  const phaseData = useMemo(() => {
    const counts = {};
    trials.forEach((t) => {
      const p = t.phase ? t.phase[0] : 'NA';
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: phaseLabel([name]), value, key: name }));
  }, [trials]);

  const sponsorData = useMemo(() => {
    const counts = {};
    trials.forEach((t) => { if (t.sponsor) counts[t.sponsor] = (counts[t.sponsor] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name: name.length > 25 ? name.slice(0, 23) + '..' : name, value }));
  }, [trials]);

  const hasResults = trials.length > 0;

  return (
    <div className="tm-page">
      <motion.div className="tm-hero" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="tm-hero-badge">TrialFinder</div>
        <h1 className="tm-title">Clinical Trial Matchmaker</h1>
        <p className="tm-subtitle">Find actively recruiting clinical trials for any condition. Real-time data from ClinicalTrials.gov.</p>
      </motion.div>

      <motion.form className="tm-search-card" onSubmit={handleSubmit} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="tm-search-bar">
          <svg className="tm-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input ref={inputRef} className="tm-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter a condition (e.g., Breast Cancer, Diabetes, Alzheimer)..." />
          <button className={`tm-search-btn ${query.trim() ? 'active' : ''}`} type="submit" disabled={!query.trim() || loading}>
            {loading ? <span className="tm-btn-spin" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>}
          </button>
        </div>
        <div className="tm-conditions-grid">
          {CONDITIONS.map((c) => (
            <button key={c.label} type="button" className="tm-cond-card" onClick={() => { setQuery(c.label); searchTrials(c.label); }}>
              <span className="tm-cond-icon">{c.icon}</span>
              <span className="tm-cond-label">{c.label}</span>
            </button>
          ))}
        </div>
      </motion.form>

      {error && !loading && <motion.div className="tm-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{error}</motion.div>}

      {loading && (
        <motion.div className="tm-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="tm-pulse-wrap"><div className="tm-pulse" /><div className="tm-pulse tm-p2" /></div>
          <p>Searching recruiting trials...</p>
        </motion.div>
      )}

      <AnimatePresence>
        {hasResults && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="tm-results-header">
              <h2>Found <strong>{totalCount.toLocaleString()}</strong> recruiting trials</h2>
              <span className="tm-showing">Showing top {trials.length}</span>
            </div>

            {allLocations.length > 0 && (
              <div className="tm-map-card">
                <div className="tm-panel-label">Trial Sites Worldwide</div>
                <MapContainer center={[20, 0]} zoom={2} className="tm-map" scrollWheelZoom={false}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com">CARTO</a>' />
                  <FitBounds locations={allLocations} />
                  {allLocations.map((loc, i) => (
                    <CircleMarker key={i} center={[loc.lat, loc.lng]} radius={5} fillColor="#10b981" fillOpacity={0.7} stroke={false}>
                      <Popup><strong>{loc.facility || 'Trial Site'}</strong><br />{[loc.city, loc.country].filter(Boolean).join(', ')}</Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            )}

            <div className="tm-charts-row">
              {phaseData.length > 0 && (
                <div className="tm-chart-card">
                  <div className="tm-panel-label">Phase Distribution</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={phaseData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={35} paddingAngle={3}>
                        {phaseData.map((d, i) => <Cell key={i} fill={PHASE_COLORS[d.key] || Q[i % Q.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {sponsorData.length > 0 && (
                <div className="tm-chart-card">
                  <div className="tm-panel-label">Top Sponsors</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={sponsorData} layout="vertical" margin={{ left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Trials">
                        {sponsorData.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="tm-trials-list">
              <div className="tm-panel-label">Matching Trials</div>
              {trials.map((t, i) => <TrialCard key={t.nctId || i} trial={t} index={i} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TrialMatchPage;
