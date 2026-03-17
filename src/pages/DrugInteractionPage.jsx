import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './DrugInteractionPage.css';

const SEVERITY_COLORS = {
  severe: '#ef4444',
  high: '#ef4444',
  moderate: '#f59e0b',
  mild: '#22c55e',
  low: '#22c55e',
  unknown: '#94a3b8',
};

const SEVERITY_ICONS = {
  severe: '\u26A0\uFE0F',
  moderate: '\u26A1',
  mild: '\u2705',
  unknown: '\u2139\uFE0F',
};

const DRUG_DB = [
  { name: 'aspirin', category: 'Pain / Anti-inflammatory' },
  { name: 'ibuprofen', category: 'Pain / Anti-inflammatory' },
  { name: 'naproxen', category: 'Pain / Anti-inflammatory' },
  { name: 'acetaminophen', category: 'Pain / Anti-inflammatory' },
  { name: 'tramadol', category: 'Pain / Anti-inflammatory' },
  { name: 'metformin', category: 'Diabetes' },
  { name: 'lisinopril', category: 'Heart & Blood Pressure' },
  { name: 'amlodipine', category: 'Heart & Blood Pressure' },
  { name: 'metoprolol', category: 'Heart & Blood Pressure' },
  { name: 'losartan', category: 'Heart & Blood Pressure' },
  { name: 'hydrochlorothiazide', category: 'Heart & Blood Pressure' },
  { name: 'furosemide', category: 'Heart & Blood Pressure' },
  { name: 'atorvastatin', category: 'Cholesterol' },
  { name: 'simvastatin', category: 'Cholesterol' },
  { name: 'omeprazole', category: 'Stomach / GI' },
  { name: 'warfarin', category: 'Blood Thinner' },
  { name: 'clopidogrel', category: 'Blood Thinner' },
  { name: 'sertraline', category: 'Mental Health' },
  { name: 'fluoxetine', category: 'Mental Health' },
  { name: 'escitalopram', category: 'Mental Health' },
  { name: 'venlafaxine', category: 'Mental Health' },
  { name: 'diazepam', category: 'Mental Health' },
  { name: 'lorazepam', category: 'Mental Health' },
  { name: 'gabapentin', category: 'Nerve / Seizure' },
  { name: 'prednisone', category: 'Steroid / Immune' },
  { name: 'levothyroxine', category: 'Thyroid' },
  { name: 'amoxicillin', category: 'Antibiotic' },
  { name: 'ciprofloxacin', category: 'Antibiotic' },
  { name: 'azithromycin', category: 'Antibiotic' },
  { name: 'doxycycline', category: 'Antibiotic' },
];

const QUICK_CHECKS = [
  { label: 'Aspirin + Warfarin', drugs: ['aspirin', 'warfarin'], icon: '\uD83E\uDE78' },
  { label: 'Metformin + Lisinopril', drugs: ['metformin', 'lisinopril'], icon: '\uD83D\uDC8A' },
  { label: 'Ibuprofen + Aspirin + Warfarin', drugs: ['ibuprofen', 'aspirin', 'warfarin'], icon: '\u26A0\uFE0F' },
  { label: 'Omeprazole + Clopidogrel', drugs: ['omeprazole', 'clopidogrel'], icon: '\uD83D\uDC89' },
  { label: 'Sertraline + Tramadol', drugs: ['sertraline', 'tramadol'], icon: '\uD83E\uDDE0' },
  { label: 'Atorvastatin + Amlodipine + Metformin', drugs: ['atorvastatin', 'amlodipine', 'metformin'], icon: '\u2764\uFE0F' },
];

function parseSeverity(text) {
  if (!text) return 'unknown';
  const lower = text.toLowerCase();
  if (lower.includes('severe') || lower.includes('serious') || lower.includes('major') || lower.includes('high')) return 'severe';
  if (lower.includes('moderate') || lower.includes('significant')) return 'moderate';
  if (lower.includes('mild') || lower.includes('minor') || lower.includes('low')) return 'mild';
  return 'unknown';
}

async function fetchRxCUI(drugName) {
  const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}&search=2`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const ids = data?.idGroup?.rxnormId;
  return ids && ids.length > 0 ? ids[0] : null;
}

async function fetchInteractions(rxcuiList) {
  if (rxcuiList.length < 2) return [];
  const url = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcuiList.join('+')}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const interactions = [];
  (data?.fullInteractionTypeGroup || []).forEach((group) => {
    (group.fullInteractionType || []).forEach((intType) => {
      const pair = intType.minConcept || [];
      const drugA = pair[0]?.name || 'Unknown';
      const drugB = pair[1]?.name || 'Unknown';
      (intType.interactionPair || []).forEach((ip) => {
        interactions.push({
          drugA,
          drugB,
          severity: parseSeverity(ip.severity),
          severityRaw: ip.severity || '',
          description: ip.description || '',
        });
      });
    });
  });
  return interactions;
}

function NetworkGraph({ drugs, interactions }) {
  const svgRef = useRef(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const width = 480;
  const height = 480;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 70;

  const nodes = useMemo(() => {
    return drugs.map((d, i) => {
      const angle = (2 * Math.PI * i) / drugs.length - Math.PI / 2;
      return {
        id: d.toLowerCase(),
        label: d,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  }, [drugs, cx, cy, radius]);

  const edges = useMemo(() => {
    return interactions.map((int, i) => {
      const nodeA = nodes.find((n) => n.id === int.drugA.toLowerCase());
      const nodeB = nodes.find((n) => n.id === int.drugB.toLowerCase());
      if (!nodeA || !nodeB) return null;
      return { ...int, nodeA, nodeB, id: `edge-${i}` };
    }).filter(Boolean);
  }, [interactions, nodes]);

  const handleEdgeHover = useCallback((e, edge) => {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    setHoveredEdge(edge);
    setTooltipPos({ x: cursorPt.x, y: cursorPt.y - 16 });
  }, []);

  if (drugs.length === 0) return null;

  return (
    <div className="di-graph-container">
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="di-network-svg">
        <defs>
          {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
            <filter key={key} id={`glow-${key}`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor={color} floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          ))}
          <filter id="node-shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.08" />
          </filter>
        </defs>

        {edges.map((edge) => (
          <g key={edge.id}>
            <line
              x1={edge.nodeA.x} y1={edge.nodeA.y}
              x2={edge.nodeB.x} y2={edge.nodeB.y}
              stroke={SEVERITY_COLORS[edge.severity]}
              strokeWidth={hoveredEdge?.id === edge.id ? 6 : 3.5}
              strokeOpacity={hoveredEdge && hoveredEdge.id !== edge.id ? 0.15 : 0.8}
              strokeLinecap="round"
              strokeDasharray={edge.severity === 'mild' ? '8 4' : 'none'}
              filter={hoveredEdge?.id === edge.id ? `url(#glow-${edge.severity})` : undefined}
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseMove={(e) => handleEdgeHover(e, edge)}
              onMouseLeave={() => setHoveredEdge(null)}
            />
          </g>
        ))}

        {nodes.map((node, i) => (
          <g key={node.id} filter="url(#node-shadow)">
            <circle cx={node.x} cy={node.y} r={36} fill="var(--color-bg-card, #fff)" stroke="var(--color-primary, #1a7f64)" strokeWidth={2.5} />
            <text x={node.x} y={node.y - 4} textAnchor="middle" dominantBaseline="middle" fontSize="9.5" fontWeight="700" fill="var(--color-text, #1e293b)">
              {node.label.length > 12 ? node.label.slice(0, 10) + '..' : node.label}
            </text>
            <text x={node.x} y={node.y + 10} textAnchor="middle" fontSize="7.5" fill="var(--color-text-dim, #94a3b8)">
              {DRUG_DB.find((d) => d.name === node.id)?.category?.split('/')[0]?.trim() || ''}
            </text>
          </g>
        ))}

        {hoveredEdge && (
          <foreignObject x={tooltipPos.x - 150} y={tooltipPos.y - 68} width={300} height={65} style={{ pointerEvents: 'none' }}>
            <div className="di-graph-tooltip" xmlns="http://www.w3.org/1999/xhtml">
              <strong>{hoveredEdge.drugA} + {hoveredEdge.drugB}</strong>
              <span className={`di-sev-badge sev-${hoveredEdge.severity}`}>{hoveredEdge.severity}</span>
            </div>
          </foreignObject>
        )}
      </svg>
    </div>
  );
}

function InteractionCard({ interaction, index }) {
  const [expanded, setExpanded] = useState(false);
  const sev = interaction.severity;

  return (
    <motion.div
      className={`dip-int-card sev-card-${sev}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <div className="dip-int-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="dip-int-card-left">
          <span className="dip-int-icon">{SEVERITY_ICONS[sev]}</span>
          <div className="dip-int-pair">
            <span className="dip-int-drug">{interaction.drugA}</span>
            <span className="dip-int-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </span>
            <span className="dip-int-drug">{interaction.drugB}</span>
          </div>
        </div>
        <div className="dip-int-card-right">
          <span className={`di-sev-badge sev-${sev}`}>{sev}</span>
          <span className={`dip-int-expand ${expanded ? 'open' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="dip-int-card-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p>{interaction.description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DrugInteractionPage() {
  const [drugs, setDrugs] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingStep, setLoadingStep] = useState('');
  const [hasChecked, setHasChecked] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const onInputChange = useCallback((val) => {
    setInputVal(val);
    if (val.trim().length < 2) { setSuggestions([]); return; }
    const lower = val.toLowerCase();
    const matched = DRUG_DB.filter((d) => d.name.includes(lower) && !drugs.includes(d.name)).slice(0, 8);
    setSuggestions(matched);
  }, [drugs]);

  const addDrug = useCallback((name) => {
    const clean = name.trim().toLowerCase();
    if (!clean || drugs.includes(clean)) return;
    setDrugs((prev) => [...prev, clean]);
    setInputVal('');
    setSuggestions([]);
    setHasChecked(false);
    setInteractions([]);
    setError('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [drugs]);

  const removeDrug = useCallback((name) => {
    setDrugs((prev) => prev.filter((d) => d !== name));
    setInteractions([]);
    setError('');
    setHasChecked(false);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        addDrug(suggestions[0].name);
      } else if (inputVal.trim()) {
        addDrug(inputVal);
      }
    }
    if (e.key === 'Backspace' && !inputVal && drugs.length > 0) {
      removeDrug(drugs[drugs.length - 1]);
    }
  }, [inputVal, addDrug, removeDrug, drugs, suggestions]);

  const checkInteractions = useCallback(async () => {
    if (drugs.length < 2) {
      setError('Add at least 2 medications to check.');
      return;
    }
    setLoading(true);
    setError('');
    setInteractions([]);
    setHasChecked(false);

    try {
      setLoadingStep('Resolving drug names...');
      const rxcuiMap = {};
      await Promise.all(
        drugs.map(async (d) => {
          const cui = await fetchRxCUI(d);
          if (cui) rxcuiMap[d] = cui;
        }),
      );

      const missing = drugs.filter((d) => !rxcuiMap[d]);
      if (missing.length > 0) {
        setError(`Could not find: ${missing.join(', ')}. Check spelling or try generic name.`);
        setLoading(false);
        return;
      }

      setLoadingStep('Checking interactions in NIH database...');
      const rxcuiList = drugs.map((d) => rxcuiMap[d]);
      const ints = await fetchInteractions(rxcuiList);
      setInteractions(ints);
      setHasChecked(true);

      if (ints.length === 0) {
        setError('No known interactions found. Your combination looks safe!');
      }
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  }, [drugs]);

  const loadCombo = useCallback((combo) => {
    setDrugs(combo.drugs);
    setInteractions([]);
    setError('');
    setHasChecked(false);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setSuggestions([]);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const severityCounts = useMemo(() => {
    const counts = { severe: 0, moderate: 0, mild: 0, unknown: 0 };
    interactions.forEach((i) => { counts[i.severity] = (counts[i.severity] || 0) + 1; });
    return counts;
  }, [interactions]);

  const showWelcome = drugs.length === 0 && !loading && interactions.length === 0;

  return (
    <div className="dip-page">
      <motion.div className="dip-hero" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="dip-hero-icon">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary, #1a7f64)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        </div>
        <h1 className="dip-title">Drug Interaction Checker</h1>
        <p className="dip-subtitle">
          Check if your medications interact with each other. Real-time data from NIH RxNav.
        </p>
      </motion.div>

      <motion.section
        className="dip-search-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        ref={wrapRef}
      >
        <div className="dip-search-bar">
          <div className="dip-search-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <div className="dip-search-inner">
            {drugs.map((d) => (
              <span key={d} className="dip-inline-chip">
                <span className="dip-chip-dot" />
                {d}
                <button className="dip-chip-x" onClick={() => removeDrug(d)} type="button">&times;</button>
              </span>
            ))}
            <input
              ref={inputRef}
              className="dip-smart-input"
              type="text"
              value={inputVal}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={drugs.length === 0 ? 'Search medications... (e.g., aspirin, metformin)' : drugs.length === 1 ? 'Add one more medication...' : 'Add another medication...'}
            />
          </div>
          <button
            className={`dip-go-btn ${drugs.length >= 2 ? 'active' : ''}`}
            onClick={checkInteractions}
            disabled={drugs.length < 2 || loading}
            title="Check Interactions"
          >
            {loading ? (
              <span className="dip-go-spinner" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            )}
          </button>
        </div>

        {suggestions.length > 0 && (
          <ul className="dip-dropdown">
            {suggestions.map((s) => (
              <li key={s.name} onClick={() => addDrug(s.name)} className="dip-dropdown-item">
                <span className="dip-dd-name">{s.name}</span>
                <span className="dip-dd-cat">{s.category}</span>
              </li>
            ))}
          </ul>
        )}
      </motion.section>

      {showWelcome && (
        <motion.div
          className="dip-welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="dip-welcome-grid">
            {QUICK_CHECKS.map((c) => (
              <button key={c.label} className="dip-qc-card" onClick={() => loadCombo(c)}>
                <span className="dip-qc-icon">{c.icon}</span>
                <span className="dip-qc-label">{c.label}</span>
                <span className="dip-qc-hint">Click to check</span>
              </button>
            ))}
          </div>

          <div className="dip-how-it-works">
            <h3>How it works</h3>
            <div className="dip-steps">
              <div className="dip-step">
                <div className="dip-step-num">1</div>
                <div className="dip-step-text">
                  <strong>Add medications</strong>
                  <span>Type drug names in the search bar above</span>
                </div>
              </div>
              <div className="dip-step-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-dim)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
              <div className="dip-step">
                <div className="dip-step-num">2</div>
                <div className="dip-step-text">
                  <strong>Check interactions</strong>
                  <span>We query the NIH RxNav database in real-time</span>
                </div>
              </div>
              <div className="dip-step-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-dim)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
              <div className="dip-step">
                <div className="dip-step-num">3</div>
                <div className="dip-step-text">
                  <strong>View results</strong>
                  <span>See interactions, severity, and a visual network</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {loading && (
        <motion.div className="dip-loading-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="dip-loading-anim">
            <div className="dip-pulse-ring" />
            <div className="dip-pulse-ring dip-ring-2" />
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <p className="dip-loading-text">{loadingStep}</p>
          <div className="dip-loading-drugs">
            {drugs.map((d) => <span key={d} className="dip-loading-pill">{d}</span>)}
          </div>
        </motion.div>
      )}

      {error && !loading && (
        <motion.div
          className={`dip-result-msg ${hasChecked && interactions.length === 0 ? 'dip-msg-safe' : 'dip-msg-warn'}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="dip-msg-icon">
            {hasChecked && interactions.length === 0 ? '\u2705' : '\u26A0\uFE0F'}
          </span>
          <span>{error}</span>
        </motion.div>
      )}

      <AnimatePresence>
        {interactions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            <div className="dip-result-header">
              <h2>
                Found <strong>{interactions.length}</strong> interaction{interactions.length !== 1 ? 's' : ''}
              </h2>
              <div className="dip-severity-pills">
                {severityCounts.severe > 0 && <span className="dip-sev-pill sev-pill-severe">{severityCounts.severe} Severe</span>}
                {severityCounts.moderate > 0 && <span className="dip-sev-pill sev-pill-moderate">{severityCounts.moderate} Moderate</span>}
                {severityCounts.mild > 0 && <span className="dip-sev-pill sev-pill-mild">{severityCounts.mild} Mild</span>}
              </div>
            </div>

            <div className="dip-results-grid">
              <div className="dip-graph-panel">
                <div className="dip-panel-label">Visual Network</div>
                <NetworkGraph drugs={drugs} interactions={interactions} />
                <div className="dip-graph-legend">
                  <span className="dip-leg"><span className="dip-leg-line" style={{ background: '#ef4444' }} /> Severe</span>
                  <span className="dip-leg"><span className="dip-leg-line" style={{ background: '#f59e0b' }} /> Moderate</span>
                  <span className="dip-leg"><span className="dip-leg-line dip-leg-dashed" style={{ background: '#22c55e' }} /> Mild</span>
                </div>
              </div>

              <div className="dip-interactions-panel">
                <div className="dip-panel-label">Interaction Details</div>
                <div className="dip-int-list">
                  {interactions.map((int, i) => (
                    <InteractionCard key={i} interaction={int} index={i} />
                  ))}
                </div>
              </div>
            </div>

            <div className="dip-disclaimer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>
                This tool provides informational data from NIH RxNav. Always consult your healthcare provider before changing medications.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DrugInteractionPage;
