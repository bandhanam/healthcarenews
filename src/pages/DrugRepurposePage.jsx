import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import './DrugRepurposePage.css';

const ACCENT = '#7c3aed';
const ACCENT_LIGHT = '#a78bfa';
const PUBCHEM_IMG = (cid) => `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=300x300`;

const QUICK_PICKS = [
  { label: 'Aspirin', q: 'aspirin' },
  { label: 'Metformin', q: 'metformin' },
  { label: 'Imatinib', q: 'imatinib' },
  { label: 'Semaglutide', q: 'semaglutide' },
  { label: 'Pembrolizumab', q: 'pembrolizumab' },
  { label: 'Caffeine', q: 'caffeine' },
  { label: 'Tamoxifen', q: 'tamoxifen' },
  { label: 'Osimertinib', q: 'osimertinib' },
];

const LIPINSKI_RULES = [
  { key: 'MolecularWeight', label: 'MW', threshold: 500, op: '\u2264', unit: 'Da' },
  { key: 'XLogP', label: 'LogP', threshold: 5, op: '\u2264', unit: '' },
  { key: 'HBondDonorCount', label: 'HBD', threshold: 5, op: '\u2264', unit: '' },
  { key: 'HBondAcceptorCount', label: 'HBA', threshold: 10, op: '\u2264', unit: '' },
];

function checkLipinski(compound) {
  return LIPINSKI_RULES.map(r => ({
    ...r,
    value: compound[r.key] ?? null,
    pass: compound[r.key] != null && compound[r.key] <= r.threshold,
  }));
}

function computeSimilarity(target, compound) {
  const props = ['MolecularWeight', 'XLogP', 'TPSA', 'HBondDonorCount', 'HBondAcceptorCount'];
  const ranges = [600, 10, 200, 8, 12];
  let sumSq = 0;
  props.forEach((p, i) => {
    const a = target[p] ?? 0;
    const b = compound[p] ?? 0;
    const diff = (a - b) / ranges[i];
    sumSq += diff * diff;
  });
  return Math.max(0, Math.round((1 - Math.sqrt(sumSq / props.length)) * 100));
}

function normalizeVal(val, max) {
  return Math.min(100, Math.max(0, ((val ?? 0) / max) * 100));
}

function formatNum(v) {
  if (v == null) return '-';
  return Number.isInteger(v) ? String(v) : Number(v).toFixed(2);
}

function PropTag({ label, value }) {
  return (
    <span className="dr-prop-tag">
      <span className="dr-prop-tag-label">{label}</span>
      <span className="dr-prop-tag-value">{value}</span>
    </span>
  );
}

function CompoundHero({ compound }) {
  if (!compound) return null;
  return (
    <motion.div className="dr-hero-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="dr-hero-card-img">
        <img
          src={PUBCHEM_IMG(compound.CID)}
          alt={`Structure of CID ${compound.CID}`}
          loading="lazy"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>
      <div className="dr-hero-card-info">
        <span className="dr-hero-card-cid">CID {compound.CID}</span>
        <h2 className="dr-hero-card-name">{compound.IUPACName || `Compound ${compound.CID}`}</h2>
        {compound.MolecularFormula && <p className="dr-hero-card-formula">{compound.MolecularFormula}</p>}
        <div className="dr-hero-card-props">
          {compound.MolecularWeight != null && <PropTag label="MW" value={`${Number(compound.MolecularWeight).toFixed(1)} Da`} />}
          {compound.XLogP != null && <PropTag label="LogP" value={Number(compound.XLogP).toFixed(2)} />}
          {compound.TPSA != null && <PropTag label="TPSA" value={`${Number(compound.TPSA).toFixed(1)} \u00C5\u00B2`} />}
          {compound.HBondDonorCount != null && <PropTag label="HBD" value={compound.HBondDonorCount} />}
          {compound.HBondAcceptorCount != null && <PropTag label="HBA" value={compound.HBondAcceptorCount} />}
          {compound.Complexity != null && <PropTag label="Complexity" value={Math.round(compound.Complexity)} />}
        </div>
      </div>
    </motion.div>
  );
}

function SimilarCard({ compound, index }) {
  const sim = compound.similarity ?? 0;
  const barColor = sim >= 90 ? '#10b981' : sim >= 80 ? ACCENT : sim >= 70 ? '#f59e0b' : '#ef4444';
  return (
    <motion.div
      className="dr-similar-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="dr-similar-card-header">
        <img
          src={PUBCHEM_IMG(compound.CID)}
          alt={`CID ${compound.CID}`}
          className="dr-similar-img"
          loading="lazy"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="dr-similar-meta">
          <span className="dr-similar-cid">CID {compound.CID}</span>
          <span className="dr-similar-name">
            {(compound.IUPACName || '').substring(0, 60) || `Compound ${compound.CID}`}
          </span>
        </div>
      </div>
      <div className="dr-sim-bar-wrap">
        <div className="dr-sim-bar-track">
          <motion.div
            className="dr-sim-bar-fill"
            style={{ background: barColor }}
            initial={{ width: 0 }}
            animate={{ width: `${sim}%` }}
            transition={{ duration: 0.8, delay: index * 0.05 }}
          />
        </div>
        <span className="dr-sim-percent" style={{ color: barColor }}>{sim}%</span>
      </div>
      <div className="dr-similar-props">
        {compound.MolecularFormula && <span className="dr-sp">{compound.MolecularFormula}</span>}
        {compound.MolecularWeight != null && <span className="dr-sp">MW: {Number(compound.MolecularWeight).toFixed(1)}</span>}
        {compound.XLogP != null && <span className="dr-sp">LogP: {Number(compound.XLogP).toFixed(2)}</span>}
      </div>
    </motion.div>
  );
}

function ChartCard({ title, children, className = '' }) {
  return (
    <motion.div className={`dr-chart-card ${className}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <h3 className="dr-chart-title">{title}</h3>
      {children}
    </motion.div>
  );
}

function DrugRepurposePage() {
  const [query, setQuery] = useState('');
  const [drugName, setDrugName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [target, setTarget] = useState(null);
  const [similar, setSimilar] = useState([]);

  const search = useCallback(async (q) => {
    if (!q.trim()) return;
    const name = q.trim();
    setDrugName(name);
    setLoading(true);
    setError('');
    setTarget(null);
    setSimilar([]);

    try {
      let compound = null;

      try {
        const localRes = await fetch(`/api/pubchem/search?q=${encodeURIComponent(name)}&limit=1`);
        if (localRes.ok) {
          const localData = await localRes.json();
          const results = localData.results || localData.compounds || (Array.isArray(localData) ? localData : []);
          if (results.length > 0) compound = results[0];
        }
      } catch {
        /* local DB unavailable */
      }

      if (!compound || !compound.CID) {
        const pubRes = await fetch(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/property/CID,MolecularFormula,MolecularWeight,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,Complexity,IUPACName/JSON`
        );
        if (!pubRes.ok) throw new Error(`Compound "${name}" not found. Try a different drug name.`);
        const pubData = await pubRes.json();
        const props = pubData?.PropertyTable?.Properties;
        if (props?.length > 0) compound = props[0];
      }

      if (!compound?.CID) throw new Error(`Could not resolve compound "${name}".`);
      setTarget(compound);

      let similarList = [];

      try {
        const simRes = await fetch(`/api/pubchem/similar?cid=${compound.CID}&limit=10`);
        if (simRes.ok) {
          const simData = await simRes.json();
          if (simData.target) setTarget(prev => ({ ...prev, ...simData.target }));
          similarList = simData.similar || [];
        }
      } catch {
        /* local similar API unavailable */
      }

      if (similarList.length === 0) {
        try {
          const sim2dRes = await fetch(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/fastsimilarity_2d/cid/${compound.CID}/property/CID,MolecularFormula,MolecularWeight,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,IUPACName/JSON?Threshold=80&MaxRecords=10`
          );
          if (sim2dRes.ok) {
            const sim2dData = await sim2dRes.json();
            const props = sim2dData?.PropertyTable?.Properties || [];
            similarList = props
              .filter(p => p.CID !== compound.CID)
              .map(p => ({ ...p, similarity: computeSimilarity(compound, p) }));
          }
        } catch {
          /* PubChem 2D similarity unavailable */
        }
      }

      similarList.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
      setSimilar(similarList);

      if (similarList.length === 0) {
        setError('Found the target compound but no structurally similar compounds were returned. Try a different compound.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    search(query);
  }, [query, search]);

  const radarData = useMemo(() => {
    if (!target || similar.length === 0) return [];
    const topSim = similar[0];
    const configs = [
      { property: 'MW', max: 600, key: 'MolecularWeight' },
      { property: 'LogP', max: 8, key: 'XLogP', offset: 3 },
      { property: 'TPSA', max: 200, key: 'TPSA' },
      { property: 'HBD', max: 8, key: 'HBondDonorCount' },
      { property: 'HBA', max: 12, key: 'HBondAcceptorCount' },
      { property: 'Complexity', max: 800, key: 'Complexity' },
    ];
    return configs.map(c => ({
      property: c.property,
      Target: normalizeVal((target[c.key] ?? 0) + (c.offset || 0), c.max + (c.offset || 0)),
      Similar: normalizeVal((topSim[c.key] ?? 0) + (c.offset || 0), c.max + (c.offset || 0)),
    }));
  }, [target, similar]);

  const scatterData = useMemo(() => {
    if (!target) return { targetData: [], similarData: [] };
    return {
      targetData: [{
        name: `CID ${target.CID} (Target)`,
        MW: Number(target.MolecularWeight) || 0,
        LogP: Number(target.XLogP) || 0,
      }],
      similarData: similar.map(s => ({
        name: `CID ${s.CID}`,
        MW: Number(s.MolecularWeight) || 0,
        LogP: Number(s.XLogP) || 0,
      })),
    };
  }, [target, similar]);

  const simDistribution = useMemo(() => {
    const buckets = [
      { range: '90-100%', min: 90, count: 0, color: '#10b981' },
      { range: '80-89%', min: 80, count: 0, color: ACCENT },
      { range: '70-79%', min: 70, count: 0, color: '#f59e0b' },
      { range: '<70%', min: 0, count: 0, color: '#ef4444' },
    ];
    similar.forEach(s => {
      const sim = s.similarity || 0;
      if (sim >= 90) buckets[0].count++;
      else if (sim >= 80) buckets[1].count++;
      else if (sim >= 70) buckets[2].count++;
      else buckets[3].count++;
    });
    return buckets.filter(b => b.count > 0);
  }, [similar]);

  const lipinskiData = useMemo(() => {
    if (!target) return [];
    return [
      { ...target, _label: 'Target' },
      ...similar.slice(0, 5).map(s => ({ ...s, _label: `CID ${s.CID}` })),
    ];
  }, [target, similar]);

  const hasData = target != null;

  return (
    <div className="dr-page">
      <div className="dr-hero">
        <span className="dr-hero-badge">DrugRepurpose</span>
        <h1 className="dr-title">Drug Repurposing Explorer</h1>
        <p className="dr-subtitle">
          Find structurally similar drug compounds for potential repurposing opportunities using molecular similarity analysis
        </p>
      </div>

      <form className="dr-search-card" onSubmit={handleSubmit}>
        <div className="dr-search-bar">
          <svg className="dr-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="dr-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter drug compound name (e.g., aspirin, metformin)..."
          />
          <button
            type="submit"
            className={`dr-search-btn ${query.trim() ? 'active' : ''}`}
            disabled={!query.trim() || loading}
          >
            {loading ? <div className="dr-btn-spin" /> : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </button>
        </div>
        <div className="dr-quick-picks">
          <span className="dr-qp-label">Try:</span>
          {QUICK_PICKS.map((p) => (
            <button key={p.q} type="button" className="dr-qp-btn" onClick={() => { setQuery(p.q); search(p.q); }}>
              {p.label}
            </button>
          ))}
        </div>
      </form>

      {error && <div className="dr-error-msg">{error}</div>}

      {loading && (
        <div className="dr-loading">
          <div className="dr-pulse-wrap">
            <div className="dr-pulse" />
            <div className="dr-pulse dr-p2" />
            <span style={{ fontSize: '1.3rem' }}>{'\uD83E\uDDEC'}</span>
          </div>
          <p>Searching for similar compounds to <strong>{drugName}</strong>...</p>
        </div>
      )}

      <AnimatePresence>
        {hasData && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CompoundHero compound={target} />

            {similar.length > 0 && (
              <>
                <h2 className="dr-section-title">
                  <span className="dr-section-icon">{'\uD83D\uDD2C'}</span>
                  Structurally Similar Compounds ({similar.length})
                </h2>
                <div className="dr-similar-grid">
                  {similar.map((s, i) => <SimilarCard key={s.CID} compound={s} index={i} />)}
                </div>
              </>
            )}

            {similar.length > 0 && (
              <div className="dr-charts-grid">
                {radarData.length > 0 && (
                  <ChartCard title="Property Comparison (Radar)">
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="var(--color-border, #e2e8f0)" />
                        <PolarAngleAxis dataKey="property" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                        <PolarRadiusAxis tick={{ fontSize: 9, fill: 'var(--color-text-dim, #94a3b8)' }} domain={[0, 100]} />
                        <Radar name="Target" dataKey="Target" stroke={ACCENT} fill={ACCENT} fillOpacity={0.25} strokeWidth={2} />
                        <Radar name={`CID ${similar[0]?.CID}`} dataKey="Similar" stroke={ACCENT_LIGHT} fill={ACCENT_LIGHT} fillOpacity={0.15} strokeWidth={2} />
                        <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                <ChartCard title="MW vs LogP Distribution">
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis
                        type="number"
                        dataKey="MW"
                        name="Molecular Weight"
                        tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }}
                        label={{ value: 'MW (Da)', position: 'bottom', fontSize: 11, fill: 'var(--color-text-dim)' }}
                      />
                      <YAxis
                        type="number"
                        dataKey="LogP"
                        name="LogP"
                        tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }}
                        label={{ value: 'LogP', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--color-text-dim)' }}
                      />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} cursor={{ strokeDasharray: '3 3' }} />
                      <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                      <Scatter name="Target" data={scatterData.targetData} fill="#ef4444" shape="star" legendType="star" />
                      <Scatter name="Similar" data={scatterData.similarData} fill={ACCENT} shape="circle" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </ChartCard>

                {simDistribution.length > 0 && (
                  <ChartCard title="Similarity Distribution" className="dr-span-full">
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={simDistribution} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                        <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                        <Bar dataKey="count" name="Compounds" radius={[6, 6, 0, 0]}>
                          {simDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}
              </div>
            )}

            {lipinskiData.length > 0 && (
              <div className="dr-lipinski-section">
                <h2 className="dr-section-title">
                  <span className="dr-section-icon">{'\uD83D\uDCCB'}</span>
                  Lipinski Rule of Five Compliance
                </h2>
                <div className="dr-table-wrap">
                  <table className="dr-lipinski-table">
                    <thead>
                      <tr>
                        <th>Compound</th>
                        {LIPINSKI_RULES.map(r => (
                          <th key={r.key}>{r.label} ({r.op}{r.threshold}{r.unit ? ` ${r.unit}` : ''})</th>
                        ))}
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lipinskiData.map((c, i) => {
                        const checks = checkLipinski(c);
                        const passCount = checks.filter(ch => ch.pass).length;
                        return (
                          <tr key={c.CID || i} className={i === 0 ? 'dr-lipinski-target' : ''}>
                            <td className="dr-lipinski-name">{c._label}</td>
                            {checks.map(ch => (
                              <td key={ch.key} className={ch.pass ? 'dr-lip-pass' : 'dr-lip-fail'}>
                                {formatNum(ch.value)}
                                <span className="dr-lip-icon">{ch.value != null ? (ch.pass ? '\u2713' : '\u2717') : ''}</span>
                              </td>
                            ))}
                            <td className={`dr-lip-score ${passCount === 4 ? 'dr-lip-perfect' : ''}`}>
                              {passCount}/4
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DrugRepurposePage;
