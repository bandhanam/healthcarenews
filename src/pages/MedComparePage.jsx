import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import './MedComparePage.css';

const Q = ['#ec4899','#f472b6','#f9a8d4','#fbcfe8','#fce7f3','#db2777','#be185d','#9d174d','#f43f5e','#e11d48'];
const Q2 = ['#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#2563eb','#1d4ed8'];

const FDA_LABEL = 'https://api.fda.gov/drug/label.json';
const FDA_EVENT = 'https://api.fda.gov/drug/event.json';

const POPULAR_PAIRS = [
  { label: 'Ibuprofen vs Acetaminophen', a: 'ibuprofen', b: 'acetaminophen' },
  { label: 'Atorvastatin vs Rosuvastatin', a: 'atorvastatin', b: 'rosuvastatin' },
  { label: 'Metformin vs Glipizide', a: 'metformin', b: 'glipizide' },
  { label: 'Lisinopril vs Losartan', a: 'lisinopril', b: 'losartan' },
  { label: 'Sertraline vs Fluoxetine', a: 'sertraline', b: 'fluoxetine' },
  { label: 'Omeprazole vs Pantoprazole', a: 'omeprazole', b: 'pantoprazole' },
];

async function fetchDrugLabel(name) {
  const q = encodeURIComponent(name);
  const res = await fetch(`${FDA_LABEL}?search=openfda.generic_name:"${q}"+openfda.brand_name:"${q}"&limit=1`);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.results?.[0] || null;
}

async function fetchAdverseCount(name) {
  const q = encodeURIComponent(name);
  const res = await fetch(`${FDA_EVENT}?search=patient.drug.medicinalproduct:"${q}"&count=patient.reaction.reactionmeddrapt.exact&limit=10`);
  if (!res.ok) return [];
  const data = await res.json();
  return data?.results || [];
}

function extractField(label, field) {
  const val = label?.[field];
  if (!val) return '';
  return Array.isArray(val) ? val[0] : val;
}

function ComparisonBar({ labelA, labelB, valueA, valueB, color }) {
  const total = valueA + valueB;
  const pctA = total > 0 ? (valueA / total) * 100 : 50;
  return (
    <div className="mc-comp-bar">
      <div className="mc-comp-sides">
        <span className="mc-comp-val" style={{ color: Q[0] }}>{valueA.toLocaleString()}</span>
        <span className="mc-comp-label">{labelA} vs {labelB}</span>
        <span className="mc-comp-val" style={{ color: Q2[0] }}>{valueB.toLocaleString()}</span>
      </div>
      <div className="mc-comp-track">
        <motion.div className="mc-comp-fill-a" style={{ width: `${pctA}%`, background: Q[0] }} initial={{ width: 0 }} animate={{ width: `${pctA}%` }} transition={{ duration: 0.6 }} />
        <motion.div className="mc-comp-fill-b" style={{ width: `${100 - pctA}%`, background: Q2[0] }} initial={{ width: 0 }} animate={{ width: `${100 - pctA}%` }} transition={{ duration: 0.6 }} />
      </div>
    </div>
  );
}

function DrugCard({ label, name, reactions, color, idx }) {
  const brand = label?.openfda?.brand_name?.[0] || name;
  const generic = label?.openfda?.generic_name?.[0] || name;
  const manufacturer = label?.openfda?.manufacturer_name?.[0] || '-';
  const route = label?.openfda?.route?.[0] || '-';
  const indications = extractField(label, 'indications_and_usage');
  const warnings = extractField(label, 'warnings');

  return (
    <motion.div className="mc-drug-card" style={{ borderTopColor: color }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
      <div className="mc-drug-badge" style={{ background: `${color}15`, color }}>{idx === 0 ? 'Drug A' : 'Drug B'}</div>
      <h3 className="mc-drug-brand">{brand}</h3>
      <span className="mc-drug-generic">{generic}</span>
      <div className="mc-drug-meta">
        <span><strong>Maker:</strong> {manufacturer}</span>
        <span><strong>Route:</strong> {route}</span>
      </div>
      {indications && (
        <div className="mc-drug-section">
          <h4>Indications</h4>
          <p>{indications.substring(0, 300)}{indications.length > 300 ? '...' : ''}</p>
        </div>
      )}
      {warnings && (
        <div className="mc-drug-section mc-warning">
          <h4>Key Warnings</h4>
          <p>{warnings.substring(0, 250)}{warnings.length > 250 ? '...' : ''}</p>
        </div>
      )}
    </motion.div>
  );
}

function MedComparePage() {
  const [drugA, setDrugA] = useState('');
  const [drugB, setDrugB] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [labelA, setLabelA] = useState(null);
  const [labelB, setLabelB] = useState(null);
  const [reactionsA, setReactionsA] = useState([]);
  const [reactionsB, setReactionsB] = useState([]);

  const compare = useCallback(async (a, b) => {
    if (!a.trim() || !b.trim()) return;
    setLoading(true);
    setError('');
    setLabelA(null);
    setLabelB(null);
    setReactionsA([]);
    setReactionsB([]);

    try {
      const [la, lb, ra, rb] = await Promise.all([
        fetchDrugLabel(a),
        fetchDrugLabel(b),
        fetchAdverseCount(a),
        fetchAdverseCount(b),
      ]);
      if (!la && !lb) setError(`No data found for either "${a}" or "${b}". Try common drug names.`);
      setLabelA(la);
      setLabelB(lb);
      setReactionsA(ra);
      setReactionsB(rb);
    } catch {
      setError('Failed to fetch comparison data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    compare(drugA, drugB);
  }, [drugA, drugB, compare]);

  const radarData = useMemo(() => {
    const allReactions = new Set([...reactionsA.map(r => r.term), ...reactionsB.map(r => r.term)]);
    const top = [...allReactions].slice(0, 8);
    return top.map((term) => ({
      reaction: term.length > 14 ? term.substring(0, 11) + '...' : term,
      drugA: reactionsA.find(r => r.term === term)?.count || 0,
      drugB: reactionsB.find(r => r.term === term)?.count || 0,
    }));
  }, [reactionsA, reactionsB]);

  const sideEffectComparison = useMemo(() => {
    const allReactions = new Set([...reactionsA.map(r => r.term), ...reactionsB.map(r => r.term)]);
    return [...allReactions].slice(0, 10).map((term) => ({
      name: term.length > 18 ? term.substring(0, 15) + '...' : term,
      [drugA || 'Drug A']: reactionsA.find(r => r.term === term)?.count || 0,
      [drugB || 'Drug B']: reactionsB.find(r => r.term === term)?.count || 0,
    }));
  }, [reactionsA, reactionsB, drugA, drugB]);

  const totalReportsA = reactionsA.reduce((s, r) => s + r.count, 0);
  const totalReportsB = reactionsB.reduce((s, r) => s + r.count, 0);
  const hasData = labelA || labelB;

  return (
    <div className="mc-page">
      <div className="mc-hero">
        <span className="mc-hero-badge">MedCompare</span>
        <h1 className="mc-title">Head-to-Head Drug Comparison</h1>
        <p className="mc-subtitle">Compare two drugs side by side — indications, warnings, adverse reactions & safety profiles</p>
      </div>

      <form className="mc-search-section" onSubmit={handleSubmit}>
        <div className="mc-inputs-row">
          <div className="mc-input-group">
            <label className="mc-input-label" style={{ color: Q[0] }}>Drug A</label>
            <input className="mc-input" value={drugA} onChange={(e) => setDrugA(e.target.value)} placeholder="e.g. ibuprofen" />
          </div>
          <div className="mc-vs-badge">VS</div>
          <div className="mc-input-group">
            <label className="mc-input-label" style={{ color: Q2[0] }}>Drug B</label>
            <input className="mc-input" value={drugB} onChange={(e) => setDrugB(e.target.value)} placeholder="e.g. acetaminophen" />
          </div>
          <button type="submit" className={`mc-compare-btn ${drugA.trim() && drugB.trim() ? 'active' : ''}`} disabled={!drugA.trim() || !drugB.trim() || loading}>
            {loading ? <div className="mc-btn-spin" /> : 'Compare'}
          </button>
        </div>
        <div className="mc-pairs">
          <span className="mc-pairs-label">Popular:</span>
          {POPULAR_PAIRS.map((p) => (
            <button key={p.label} type="button" className="mc-pair-btn" onClick={() => { setDrugA(p.a); setDrugB(p.b); compare(p.a, p.b); }}>{p.label}</button>
          ))}
        </div>
      </form>

      {error && <div className="mc-error">{error}</div>}

      {loading && (
        <div className="mc-loading">
          <div className="mc-pulse-wrap"><div className="mc-pulse" /><div className="mc-pulse mc-p2" /><span>{'\u2696\uFE0F'}</span></div>
          <p>Comparing <strong>{drugA}</strong> vs <strong>{drugB}</strong>...</p>
        </div>
      )}

      <AnimatePresence>
        {hasData && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mc-cards-row">
              {labelA && <DrugCard label={labelA} name={drugA} reactions={reactionsA} color={Q[0]} idx={0} />}
              {labelB && <DrugCard label={labelB} name={drugB} reactions={reactionsB} color={Q2[0]} idx={1} />}
            </div>

            {(totalReportsA > 0 || totalReportsB > 0) && (
              <motion.div className="mc-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h3 className="mc-chart-title">Safety Report Volume</h3>
                <ComparisonBar labelA={drugA} labelB={drugB} valueA={totalReportsA} valueB={totalReportsB} />
              </motion.div>
            )}

            <div className="mc-charts-grid">
              {sideEffectComparison.length > 0 && (
                <motion.div className="mc-chart-card mc-span-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="mc-chart-title">Adverse Reaction Comparison</h3>
                  <ResponsiveContainer width="100%" height={Math.max(200, sideEffectComparison.length * 28)}>
                    <BarChart data={sideEffectComparison} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text, #1e293b)' }} width={75} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                      <Bar dataKey={drugA || 'Drug A'} fill={Q[0]} radius={[0, 6, 6, 0]} />
                      <Bar dataKey={drugB || 'Drug B'} fill={Q2[0]} radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {radarData.length > 2 && (
                <motion.div className="mc-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="mc-chart-title">Side Effect Profile Radar</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--color-border, #e2e8f0)" />
                      <PolarAngleAxis dataKey="reaction" tick={{ fontSize: 9, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <PolarRadiusAxis tick={{ fontSize: 8 }} />
                      <Radar dataKey="drugA" name={drugA || 'Drug A'} stroke={Q[0]} fill={Q[0]} fillOpacity={0.2} strokeWidth={2} />
                      <Radar dataKey="drugB" name={drugB || 'Drug B'} stroke={Q2[0]} fill={Q2[0]} fillOpacity={0.2} strokeWidth={2} />
                      <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {reactionsA.length > 0 && (
                <motion.div className="mc-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="mc-chart-title">{drugA} Top Reactions</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={reactionsA.slice(0, 6).map(r => ({ name: r.term, value: r.count }))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {reactionsA.slice(0, 6).map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.68rem' }} />
                    </PieChart>
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

export default MedComparePage;
