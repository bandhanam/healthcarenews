import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './DrugComparePage.css';

const Q = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16'];
const SRC_COLORS = { FDA: '#3b82f6', EMA: '#10b981', CDSCO: '#f59e0b' };
const POPULAR = [
  { label: 'Metformin', q: 'metformin' }, { label: 'Atorvastatin', q: 'atorvastatin' },
  { label: 'Omeprazole', q: 'omeprazole' }, { label: 'Lisinopril', q: 'lisinopril' },
  { label: 'Amlodipine', q: 'amlodipine' }, { label: 'Ibuprofen', q: 'ibuprofen' },
  { label: 'Sertraline', q: 'sertraline' }, { label: 'Warfarin', q: 'warfarin' },
];

function DrugComparePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [fdaLabel, setFdaLabel] = useState(null);

  const searchDrug = useCallback(async (q) => {
    const name = q.trim();
    if (!name) return;
    setLoading(true);
    setError('');
    setResults([]);
    setFdaLabel(null);

    try {
      const [dbRes, labelRes] = await Promise.all([
        fetch(`/api/approvals/search?q=${encodeURIComponent(name)}&limit=100`).then((r) => r.ok ? r.json() : null),
        fetch(`https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(name)}"+openfda.brand_name:"${encodeURIComponent(name)}"&limit=1`).then((r) => r.ok ? r.json() : null).catch(() => null),
      ]);

      if (dbRes?.results) {
        setResults(dbRes.results);
        setTotalCount(dbRes.total || dbRes.results.length);
      }

      if (labelRes?.results?.[0]) {
        const lbl = labelRes.results[0];
        setFdaLabel({
          brandName: lbl.openfda?.brand_name?.[0] || '',
          genericName: lbl.openfda?.generic_name?.[0] || '',
          manufacturer: lbl.openfda?.manufacturer_name?.[0] || '',
          route: lbl.openfda?.route?.[0] || '',
          substance: lbl.openfda?.substance_name?.[0] || '',
          productType: lbl.openfda?.product_type?.[0] || '',
          warnings: lbl.warnings?.[0]?.substring(0, 400) || '',
          indications: lbl.indications_and_usage?.[0]?.substring(0, 400) || '',
          interactions: lbl.drug_interactions?.[0]?.substring(0, 400) || '',
        });
      }

      if ((!dbRes?.results || dbRes.results.length === 0) && !labelRes?.results?.[0]) {
        setError(`No data found for "${name}". Try the generic or brand name.`);
      }
    } catch {
      setError('Failed to fetch drug data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback((e) => { e.preventDefault(); searchDrug(query); }, [query, searchDrug]);

  const bySource = useMemo(() => {
    const counts = {};
    results.forEach((r) => { counts[r.source] = (counts[r.source] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [results]);

  const byArea = useMemo(() => {
    const counts = {};
    results.forEach((r) => { if (r.therapeutic_area) counts[r.therapeutic_area] = (counts[r.therapeutic_area] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name: name.length > 25 ? name.slice(0, 23) + '..' : name, value }));
  }, [results]);

  const manufacturers = useMemo(() => {
    const counts = {};
    results.forEach((r) => { if (r.manufacturer) counts[r.manufacturer] = (counts[r.manufacturer] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name: name.length > 30 ? name.slice(0, 28) + '..' : name, count }));
  }, [results]);

  const generics = useMemo(() => {
    const seen = new Set();
    return results.filter((r) => {
      const key = (r.generic_name || r.active_substance || '').toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 10);
  }, [results]);

  const hasResults = results.length > 0 || fdaLabel;

  return (
    <div className="dc-page">
      <motion.div className="dc-hero" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="dc-hero-badge">PriceRx</div>
        <h1 className="dc-title">Drug Compare & Explore</h1>
        <p className="dc-subtitle">Compare brand vs generic, multi-country approvals, and drug details from FDA, EMA & CDSCO databases.</p>
      </motion.div>

      <motion.form className="dc-search-card" onSubmit={handleSubmit} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="dc-search-bar">
          <svg className="dc-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="dc-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a drug (e.g., Metformin, Atorvastatin, Omeprazole)..." />
          <button className={`dc-search-btn ${query.trim() ? 'active' : ''}`} type="submit" disabled={!query.trim() || loading}>
            {loading ? <span className="dc-btn-spin" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>}
          </button>
        </div>
        <div className="dc-popular">
          <span className="dc-pop-label">Popular:</span>
          {POPULAR.map((p) => <button key={p.q} type="button" className="dc-pop-btn" onClick={() => { setQuery(p.q); searchDrug(p.q); }}>{p.label}</button>)}
        </div>
      </motion.form>

      {error && !loading && <motion.div className="dc-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{error}</motion.div>}
      {loading && (
        <motion.div className="dc-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="dc-pulse-wrap"><div className="dc-pulse" /><div className="dc-pulse dc-p2" /></div>
          <p>Searching across FDA, EMA & CDSCO...</p>
        </motion.div>
      )}

      <AnimatePresence>
        {hasResults && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {fdaLabel && (
              <div className="dc-drug-hero-card">
                <div className="dc-drug-hero-top">
                  <div>
                    <h2 className="dc-drug-brand">{fdaLabel.brandName || query}</h2>
                    {fdaLabel.genericName && <p className="dc-drug-generic">Generic: <strong>{fdaLabel.genericName}</strong></p>}
                  </div>
                  <div className="dc-drug-badges">
                    {fdaLabel.route && <span className="dc-info-badge">{fdaLabel.route}</span>}
                    {fdaLabel.productType && <span className="dc-info-badge dc-badge-type">{fdaLabel.productType}</span>}
                  </div>
                </div>
                {fdaLabel.manufacturer && <p className="dc-drug-mfr">Manufacturer: {fdaLabel.manufacturer}</p>}
                <div className="dc-drug-sections">
                  {fdaLabel.indications && (
                    <div className="dc-drug-section">
                      <h4>Indications & Usage</h4>
                      <p>{fdaLabel.indications}</p>
                    </div>
                  )}
                  {fdaLabel.warnings && (
                    <div className="dc-drug-section dc-section-warn">
                      <h4>Warnings</h4>
                      <p>{fdaLabel.warnings}</p>
                    </div>
                  )}
                  {fdaLabel.interactions && (
                    <div className="dc-drug-section dc-section-int">
                      <h4>Drug Interactions</h4>
                      <p>{fdaLabel.interactions}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {results.length > 0 && (
              <>
                <div className="dc-stats-row">
                  <div className="dc-stat"><span className="dc-stat-num" style={{ color: '#3b82f6' }}>{totalCount}</span><span className="dc-stat-lbl">Total Approvals</span></div>
                  <div className="dc-stat"><span className="dc-stat-num" style={{ color: '#10b981' }}>{bySource.length}</span><span className="dc-stat-lbl">Regulatory Bodies</span></div>
                  <div className="dc-stat"><span className="dc-stat-num" style={{ color: '#8b5cf6' }}>{manufacturers.length}</span><span className="dc-stat-lbl">Manufacturers</span></div>
                  <div className="dc-stat"><span className="dc-stat-num" style={{ color: '#f59e0b' }}>{generics.length}</span><span className="dc-stat-lbl">Unique Formulations</span></div>
                </div>

                <div className="dc-charts-row">
                  {bySource.length > 0 && (
                    <div className="dc-chart-card">
                      <div className="dc-panel-label">Approvals by Region</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={bySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={35} paddingAngle={4}>
                            {bySource.map((d) => <Cell key={d.name} fill={SRC_COLORS[d.name] || '#94a3b8'} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {byArea.length > 0 && (
                    <div className="dc-chart-card">
                      <div className="dc-panel-label">Therapeutic Areas</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={byArea} layout="vertical" margin={{ left: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} />
                          <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 9 }} />
                          <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Approvals">
                            {byArea.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {manufacturers.length > 0 && (
                  <div className="dc-mfr-section">
                    <div className="dc-panel-label">Manufacturers & Generic Options</div>
                    <div className="dc-mfr-grid">
                      {manufacturers.map((m, i) => (
                        <div key={i} className="dc-mfr-card">
                          <div className="dc-mfr-icon" style={{ background: `${Q[i % Q.length]}15`, color: Q[i % Q.length] }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
                          </div>
                          <div className="dc-mfr-info">
                            <span className="dc-mfr-name">{m.name}</span>
                            <span className="dc-mfr-count">{m.count} approval{m.count > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {generics.length > 0 && (
                  <div className="dc-generics-section">
                    <div className="dc-panel-label">Available Formulations</div>
                    <div className="dc-generics-table-wrap">
                      <table className="dc-table">
                        <thead>
                          <tr><th>Drug Name</th><th>Generic / Active</th><th>Source</th><th>Route</th><th>Form</th><th>Approval Date</th></tr>
                        </thead>
                        <tbody>
                          {generics.map((r, i) => (
                            <tr key={i}>
                              <td className="dc-td-bold">{r.drug_name}</td>
                              <td>{r.generic_name || r.active_substance || '--'}</td>
                              <td><span className="dc-src-badge" style={{ background: `${SRC_COLORS[r.source] || '#94a3b8'}18`, color: SRC_COLORS[r.source] || '#94a3b8' }}>{r.source}</span></td>
                              <td>{r.route || '--'}</td>
                              <td>{r.dosage_form || '--'}</td>
                              <td>{r.approval_date ? new Date(r.approval_date).toLocaleDateString() : '--'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DrugComparePage;
