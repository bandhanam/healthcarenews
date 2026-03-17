import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import './ChemExplorerPage.css';

const ACCENT = '#059669';
const ACCENT_LIGHT = '#34d399';
const ACCENT_BG = 'rgba(5, 150, 105, 0.08)';

const QUICK_PICKS = [
  'aspirin', 'metformin', 'caffeine', 'ibuprofen', 'atorvastatin',
  'semaglutide', 'penicillin', 'sildenafil', 'paclitaxel', 'tamoxifen',
];

const PUBCHEM_IMG = (cid) => `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG`;

function normalizePubChemDirect(data) {
  const props = data?.PropertyTable?.Properties?.[0];
  if (!props) return null;
  return {
    cid: props.CID,
    name: null,
    iupac_name: props.IUPACName,
    molecular_formula: props.MolecularFormula,
    molecular_weight: props.MolecularWeight,
    exact_mass: null,
    xlogp: props.XLogP,
    tpsa: props.TPSA,
    complexity: props.Complexity,
    hbond_donor: props.HBondDonorCount,
    hbond_acceptor: props.HBondAcceptorCount,
    rotatable_bonds: props.RotatableBondCount,
    heavy_atom_count: props.HeavyAtomCount,
    charge: props.Charge,
    canonical_smiles: props.CanonicalSMILES,
    isomeric_smiles: null,
    inchi_key: props.InChIKey,
    drug_likeness: null,
    synonyms: [],
    image_url: props.CID ? PUBCHEM_IMG(props.CID) : null,
  };
}

function checkLipinski(compound) {
  const mw = compound.molecular_weight ?? 0;
  const xlogp = compound.xlogp ?? 0;
  const hbd = compound.hbond_donor ?? 0;
  const hba = compound.hbond_acceptor ?? 0;
  const rules = [
    { label: 'MW <= 500', pass: mw <= 500, value: mw, limit: 500 },
    { label: 'XLogP <= 5', pass: xlogp <= 5, value: xlogp, limit: 5 },
    { label: 'HBD <= 5', pass: hbd <= 5, value: hbd, limit: 5 },
    { label: 'HBA <= 10', pass: hba <= 10, value: hba, limit: 10 },
  ];
  const passCount = rules.filter((r) => r.pass).length;
  return { rules, passCount, total: 4, compliant: passCount >= 3 };
}

function buildRadarData(compound) {
  const mw = Math.min((compound.molecular_weight ?? 0) / 500, 2);
  const xlogp = Math.min(Math.max((compound.xlogp ?? 0) + 2, 0) / 10, 2);
  const tpsa = Math.min((compound.tpsa ?? 0) / 200, 2);
  const hbd = Math.min((compound.hbond_donor ?? 0) / 10, 2);
  const hba = Math.min((compound.hbond_acceptor ?? 0) / 15, 2);
  const complexity = Math.min((compound.complexity ?? 0) / 1000, 2);
  return [
    { property: 'MW', value: mw, fullMark: 2 },
    { property: 'XLogP', value: xlogp, fullMark: 2 },
    { property: 'TPSA', value: tpsa, fullMark: 2 },
    { property: 'HBD', value: hbd, fullMark: 2 },
    { property: 'HBA', value: hba, fullMark: 2 },
    { property: 'Complexity', value: complexity, fullMark: 2 },
  ];
}

function buildBarData(compound) {
  return [
    { name: 'MW', value: compound.molecular_weight ?? 0 },
    { name: 'TPSA', value: compound.tpsa ?? 0 },
    { name: 'Complexity', value: compound.complexity ?? 0 },
    { name: 'XLogP', value: compound.xlogp ?? 0 },
    { name: 'HBD', value: compound.hbond_donor ?? 0 },
    { name: 'HBA', value: compound.hbond_acceptor ?? 0 },
    { name: 'Rotatable', value: compound.rotatable_bonds ?? 0 },
    { name: 'Heavy Atoms', value: compound.heavy_atom_count ?? 0 },
  ];
}

function buildLipinskiPie(lipinski) {
  return [
    { name: 'Pass', value: lipinski.passCount, color: '#059669' },
    { name: 'Fail', value: lipinski.total - lipinski.passCount, color: '#ef4444' },
  ].filter((d) => d.value > 0);
}

function DrugCard({ compound, onClose }) {
  const lipinski = useMemo(() => checkLipinski(compound), [compound]);
  const radarData = useMemo(() => buildRadarData(compound), [compound]);
  const barData = useMemo(() => buildBarData(compound), [compound]);
  const pieData = useMemo(() => buildLipinskiPie(lipinski), [lipinski]);
  const displayName = compound.name || compound.iupac_name || `CID ${compound.cid}`;
  const imgUrl = compound.image_url || (compound.cid ? PUBCHEM_IMG(compound.cid) : null);

  return (
    <motion.div
      className="ce-drug-card"
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <div className="ce-card-header">
        <div>
          <h2 className="ce-card-title">{displayName}</h2>
          {compound.iupac_name && compound.name && (
            <p className="ce-card-iupac">{compound.iupac_name}</p>
          )}
          {compound.cid && <span className="ce-cid-badge">CID {compound.cid}</span>}
        </div>
        <button className="ce-close-btn" onClick={onClose} aria-label="Close">x</button>
      </div>

      <div className="ce-card-body">
        <div className="ce-card-top-row">
          {imgUrl && (
            <div className="ce-structure-img-wrap">
              <img src={imgUrl} alt={`${displayName} 2D structure`} className="ce-structure-img" />
              <span className="ce-img-label">2D Structure</span>
            </div>
          )}
          <div className="ce-key-stats">
            <h3>Key Properties</h3>
            <div className="ce-stats-grid">
              <StatItem label="Molecular Weight" value={compound.molecular_weight} unit="g/mol" />
              <StatItem label="Formula" value={compound.molecular_formula} />
              <StatItem label="XLogP" value={compound.xlogp} />
              <StatItem label="TPSA" value={compound.tpsa} unit={'\u00C5\u00B2'} />
              <StatItem label="Complexity" value={compound.complexity} />
              <StatItem label="Charge" value={compound.charge} />
              <StatItem label="HB Donors" value={compound.hbond_donor} />
              <StatItem label="HB Acceptors" value={compound.hbond_acceptor} />
              <StatItem label="Rotatable Bonds" value={compound.rotatable_bonds} />
              <StatItem label="Heavy Atoms" value={compound.heavy_atom_count} />
            </div>
          </div>
        </div>

        <div className="ce-lipinski-section">
          <h3>Lipinski Rule of 5</h3>
          <div className="ce-lipinski-row">
            <div className="ce-lipinski-overall">
              <span className={`ce-lipinski-verdict ${lipinski.compliant ? 'pass' : 'fail'}`}>
                {lipinski.compliant ? 'Drug-Like' : 'Violation'}
              </span>
              <span className="ce-lipinski-score">{lipinski.passCount}/{lipinski.total} rules passed</span>
            </div>
            <div className="ce-lipinski-badges">
              {lipinski.rules.map((r) => (
                <span key={r.label} className={`ce-lipinski-badge ${r.pass ? 'pass' : 'fail'}`}>
                  <span className="ce-badge-icon">{r.pass ? '\u2713' : '\u2717'}</span>
                  {r.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="ce-charts-grid">
          <div className="ce-chart-card">
            <h3>Molecular Profile</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="rgba(5,150,105,0.15)" />
                <PolarAngleAxis dataKey="property" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <PolarRadiusAxis angle={30} domain={[0, 2]} tick={false} axisLine={false} />
                <Radar
                  name="Properties"
                  dataKey="value"
                  stroke={ACCENT}
                  fill={ACCENT}
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Tooltip formatter={(v) => v.toFixed(2)} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="ce-chart-card">
            <h3>Properties Overview</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? ACCENT : ACCENT_LIGHT} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="ce-chart-card">
            <h3>Lipinski Compliance</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={45}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {compound.canonical_smiles && (
          <div className="ce-smiles-section">
            <h3>SMILES</h3>
            <code className="ce-smiles-code">{compound.canonical_smiles}</code>
            {compound.isomeric_smiles && compound.isomeric_smiles !== compound.canonical_smiles && (
              <>
                <h4 className="ce-smiles-sub">Isomeric SMILES</h4>
                <code className="ce-smiles-code">{compound.isomeric_smiles}</code>
              </>
            )}
          </div>
        )}

        {compound.inchi_key && (
          <div className="ce-inchi-section">
            <h3>InChIKey</h3>
            <code className="ce-smiles-code">{compound.inchi_key}</code>
          </div>
        )}

        {compound.synonyms && compound.synonyms.length > 0 && (
          <div className="ce-synonyms-section">
            <h3>Synonyms / Alternate Names</h3>
            <div className="ce-synonyms-list">
              {(Array.isArray(compound.synonyms) ? compound.synonyms : [compound.synonyms])
                .slice(0, 20)
                .map((syn, i) => (
                  <span key={i} className="ce-synonym-chip">{syn}</span>
                ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatItem({ label, value, unit }) {
  if (value == null && value !== 0) return null;
  return (
    <div className="ce-stat-item">
      <span className="ce-stat-label">{label}</span>
      <span className="ce-stat-value">
        {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(2)) : value}
        {unit && <span className="ce-stat-unit"> {unit}</span>}
      </span>
    </div>
  );
}

function BrowseCard({ compound, onClick }) {
  const imgUrl = compound.image_url || (compound.cid ? PUBCHEM_IMG(compound.cid) : null);
  return (
    <motion.div
      className="ce-browse-card"
      onClick={onClick}
      whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(5,150,105,0.12)' }}
      transition={{ duration: 0.2 }}
    >
      {imgUrl && <img src={imgUrl} alt={compound.name} className="ce-browse-img" />}
      <div className="ce-browse-info">
        <h4 className="ce-browse-name">{compound.name || `CID ${compound.cid}`}</h4>
        {compound.molecular_formula && (
          <span className="ce-browse-formula">{compound.molecular_formula}</span>
        )}
        {compound.molecular_weight && (
          <span className="ce-browse-mw">MW: {Number(compound.molecular_weight).toFixed(1)}</span>
        )}
      </div>
    </motion.div>
  );
}

function ChemExplorerPage() {
  const [query, setQuery] = useState('');
  const [compound, setCompound] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [browseList, setBrowseList] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/pubchem/search?limit=12&drug_likeness=true');
        if (!res.ok) throw new Error('Failed to load browse data');
        const data = await res.json();
        if (!cancelled) setBrowseList(data.results || []);
      } catch {
        if (!cancelled) setBrowseList([]);
      } finally {
        if (!cancelled) setBrowseLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const searchCompound = useCallback(async (name) => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    setCompound(null);

    try {
      const localRes = await fetch(`/api/pubchem/search?q=${encodeURIComponent(name.trim())}`);
      const localData = await localRes.json();

      if (localData.results && localData.results.length > 0) {
        setCompound(localData.results[0]);
        setLoading(false);
        return;
      }

      const pubUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name.trim())}/property/MolecularFormula,MolecularWeight,IUPACName,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,HeavyAtomCount,Complexity,Charge,CanonicalSMILES,InChIKey/JSON`;
      const pubRes = await fetch(pubUrl);

      if (!pubRes.ok) throw new Error('Compound not found. Try a different name.');
      const pubData = await pubRes.json();
      const normalized = normalizePubChemDirect(pubData);
      if (!normalized) throw new Error('Unable to parse compound data.');
      normalized.name = name.trim();
      setCompound(normalized);
    } catch (err) {
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    searchCompound(query);
  };

  const handleQuickPick = (name) => {
    setQuery(name);
    searchCompound(name);
  };

  const handleBrowseClick = (c) => {
    setCompound(c);
    setQuery(c.name || '');
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="ce-page">
      <motion.div
        className="ce-hero"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="ce-hero-badge">Drug Compound Explorer</span>
        <h1 className="ce-title">ChemExplorer</h1>
        <p className="ce-subtitle">
          Search and explore drug compounds with molecular properties, Lipinski analysis,
          and interactive visualizations powered by PubChem.
        </p>
      </motion.div>

      <motion.form
        className="ce-search-bar"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <div className="ce-search-input-wrap">
          <span className="ce-search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            type="text"
            className="ce-search-input"
            placeholder="Search a drug compound (e.g. aspirin, metformin)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <button type="submit" className="ce-search-btn" disabled={loading || !query.trim()}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </motion.form>

      <motion.div
        className="ce-quick-picks"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <span className="ce-picks-label">Quick pick:</span>
        {QUICK_PICKS.map((drug) => (
          <button
            key={drug}
            className={`ce-pick-btn ${query.toLowerCase() === drug ? 'active' : ''}`}
            onClick={() => handleQuickPick(drug)}
          >
            {drug}
          </button>
        ))}
      </motion.div>

      {loading && (
        <div className="ce-loading">
          <div className="ce-spinner" />
          <span>Fetching compound data...</span>
        </div>
      )}

      {error && !loading && (
        <motion.div
          className="ce-error"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <span className="ce-error-icon">!</span>
          <span>{error}</span>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {compound && !loading && (
          <DrugCard
            key={compound.cid || compound.name}
            compound={compound}
            onClose={() => setCompound(null)}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="ce-browse-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="ce-browse-title">Browse Database</h2>
        <p className="ce-browse-subtitle">
          Drug-like compounds from the local database. Click any card to explore.
        </p>
        {browseLoading ? (
          <div className="ce-loading">
            <div className="ce-spinner" />
            <span>Loading compounds...</span>
          </div>
        ) : browseList.length > 0 ? (
          <div className="ce-browse-grid">
            {browseList.map((c, i) => (
              <BrowseCard key={c.cid || i} compound={c} onClick={() => handleBrowseClick(c)} />
            ))}
          </div>
        ) : (
          <div className="ce-empty-browse">
            No compounds available in local database. Use the search above to explore PubChem directly.
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default ChemExplorerPage;
