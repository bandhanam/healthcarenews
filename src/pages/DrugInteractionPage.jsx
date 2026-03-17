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

const POPULAR_COMBOS = [
  { label: 'Aspirin + Warfarin', drugs: ['aspirin', 'warfarin'] },
  { label: 'Metformin + Lisinopril', drugs: ['metformin', 'lisinopril'] },
  { label: 'Ibuprofen + Aspirin', drugs: ['ibuprofen', 'aspirin'] },
  { label: 'Atorvastatin + Amlodipine', drugs: ['atorvastatin', 'amlodipine'] },
  { label: 'Omeprazole + Clopidogrel', drugs: ['omeprazole', 'clopidogrel'] },
  { label: 'Sertraline + Tramadol', drugs: ['sertraline', 'tramadol'] },
];

const DRUG_SUGGESTIONS = [
  'aspirin', 'ibuprofen', 'metformin', 'lisinopril', 'atorvastatin',
  'amlodipine', 'omeprazole', 'warfarin', 'clopidogrel', 'sertraline',
  'metoprolol', 'losartan', 'gabapentin', 'hydrochlorothiazide', 'simvastatin',
  'acetaminophen', 'prednisone', 'levothyroxine', 'furosemide', 'tramadol',
  'amoxicillin', 'ciprofloxacin', 'azithromycin', 'doxycycline', 'naproxen',
  'diazepam', 'lorazepam', 'fluoxetine', 'escitalopram', 'venlafaxine',
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
  const pairs = data?.fullInteractionTypeGroup || [];

  pairs.forEach((group) => {
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

  const width = 560;
  const height = 560;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 80;

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
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="di-network-svg"
      >
        <defs>
          {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
            <filter key={key} id={`glow-${key}`}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feFlood floodColor={color} floodOpacity="0.4" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {edges.map((edge) => (
          <line
            key={edge.id}
            x1={edge.nodeA.x}
            y1={edge.nodeA.y}
            x2={edge.nodeB.x}
            y2={edge.nodeB.y}
            stroke={SEVERITY_COLORS[edge.severity]}
            strokeWidth={hoveredEdge?.id === edge.id ? 5 : 3}
            strokeOpacity={hoveredEdge && hoveredEdge.id !== edge.id ? 0.25 : 0.85}
            strokeLinecap="round"
            filter={hoveredEdge?.id === edge.id ? `url(#glow-${edge.severity})` : undefined}
            style={{ cursor: 'pointer', transition: 'stroke-width 0.15s, stroke-opacity 0.15s' }}
            onMouseMove={(e) => handleEdgeHover(e, edge)}
            onMouseLeave={() => setHoveredEdge(null)}
          />
        ))}

        {nodes.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={28}
              fill="var(--color-bg-card, #fff)"
              stroke="var(--color-primary, #3b82f6)"
              strokeWidth={2.5}
            />
            <text
              x={node.x}
              y={node.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={node.label.length > 10 ? 9 : 10.5}
              fontWeight="700"
              fill="var(--color-text, #1e293b)"
            >
              {node.label.length > 14 ? node.label.slice(0, 12) + '...' : node.label}
            </text>
          </g>
        ))}

        {hoveredEdge && (
          <foreignObject
            x={tooltipPos.x - 140}
            y={tooltipPos.y - 64}
            width={280}
            height={60}
            style={{ pointerEvents: 'none' }}
          >
            <div className="di-graph-tooltip" xmlns="http://www.w3.org/1999/xhtml">
              <strong>{hoveredEdge.drugA} + {hoveredEdge.drugB}</strong>
              <span className={`di-sev-badge sev-${hoveredEdge.severity}`}>
                {hoveredEdge.severity}
              </span>
            </div>
          </foreignObject>
        )}
      </svg>

      <div className="di-graph-legend">
        {Object.entries(SEVERITY_COLORS).filter(([k]) => k !== 'high' && k !== 'low').map(([label, color]) => (
          <span key={label} className="di-legend-item">
            <span className="di-legend-line" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function DrugInteractionPage() {
  const [drugs, setDrugs] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resolvedNames, setResolvedNames] = useState({});
  const wrapRef = useRef(null);

  const onInputChange = useCallback((val) => {
    setInputVal(val);
    if (val.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const lower = val.toLowerCase();
    setSuggestions(
      DRUG_SUGGESTIONS.filter(
        (s) => s.includes(lower) && !drugs.includes(s),
      ).slice(0, 6),
    );
  }, [drugs]);

  const addDrug = useCallback((name) => {
    const clean = name.trim().toLowerCase();
    if (!clean || drugs.includes(clean)) return;
    setDrugs((prev) => [...prev, clean]);
    setInputVal('');
    setSuggestions([]);
  }, [drugs]);

  const removeDrug = useCallback((name) => {
    setDrugs((prev) => prev.filter((d) => d !== name));
    setInteractions([]);
    setError('');
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputVal.trim()) addDrug(inputVal);
    }
  }, [inputVal, addDrug]);

  const checkInteractions = useCallback(async () => {
    if (drugs.length < 2) {
      setError('Please add at least 2 drugs to check interactions.');
      return;
    }
    setLoading(true);
    setError('');
    setInteractions([]);

    try {
      const rxcuiMap = {};
      const resolved = {};
      await Promise.all(
        drugs.map(async (d) => {
          const cui = await fetchRxCUI(d);
          if (cui) {
            rxcuiMap[d] = cui;
            resolved[d] = d;
          }
        }),
      );

      const missingDrugs = drugs.filter((d) => !rxcuiMap[d]);
      if (missingDrugs.length > 0) {
        setError(`Could not find RxNorm IDs for: ${missingDrugs.join(', ')}. Try a different spelling.`);
        setLoading(false);
        return;
      }

      setResolvedNames(resolved);
      const rxcuiList = drugs.map((d) => rxcuiMap[d]);
      const ints = await fetchInteractions(rxcuiList);
      setInteractions(ints);

      if (ints.length === 0) {
        setError('No known interactions found between these drugs.');
      }
    } catch (err) {
      setError('Failed to fetch interaction data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [drugs]);

  const loadCombo = useCallback((combo) => {
    setDrugs(combo.drugs);
    setInteractions([]);
    setError('');
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const severityCounts = useMemo(() => {
    const counts = { severe: 0, moderate: 0, mild: 0, unknown: 0 };
    interactions.forEach((i) => {
      counts[i.severity] = (counts[i.severity] || 0) + 1;
    });
    return counts;
  }, [interactions]);

  return (
    <div className="dip-page">
      <motion.div
        className="dip-hero"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="dip-title">Drug Interaction Network</h1>
        <p className="dip-subtitle">
          Enter your medications to check for known drug-drug interactions.
          Powered by NIH RxNav real-time data.
        </p>
      </motion.div>

      <section className="dip-input-section">
        <div className="dip-input-row" ref={wrapRef}>
          <div className="dip-autocomplete-wrap">
            <input
              className="dip-drug-input"
              type="text"
              value={inputVal}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a drug name (e.g., aspirin)..."
            />
            {suggestions.length > 0 && (
              <ul className="dip-suggestions">
                {suggestions.map((s) => (
                  <li key={s} onClick={() => addDrug(s)} className="dip-suggestion-item">
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            className="dip-add-btn"
            onClick={() => inputVal.trim() && addDrug(inputVal)}
            disabled={!inputVal.trim()}
          >
            + Add
          </button>
          <button
            className="dip-check-btn"
            onClick={checkInteractions}
            disabled={drugs.length < 2 || loading}
          >
            {loading ? 'Checking...' : 'Check Interactions'}
          </button>
        </div>

        {drugs.length > 0 && (
          <div className="dip-drug-chips">
            {drugs.map((d) => (
              <span key={d} className="dip-drug-chip">
                {d}
                <button className="dip-chip-remove" onClick={() => removeDrug(d)}>&times;</button>
              </span>
            ))}
            <button className="dip-clear-all" onClick={() => { setDrugs([]); setInteractions([]); setError(''); }}>
              Clear all
            </button>
          </div>
        )}

        <div className="dip-popular">
          <span className="dip-popular-label">Try:</span>
          {POPULAR_COMBOS.map((c) => (
            <button key={c.label} className="dip-popular-btn" onClick={() => loadCombo(c)}>
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className={`dip-message ${interactions.length === 0 && !error.includes('No known') ? 'dip-message-error' : 'dip-message-info'}`}>
          {error}
        </div>
      )}

      {loading && (
        <div className="dip-loading">
          <div className="dip-spinner" />
          <p>Querying NIH RxNav database...</p>
        </div>
      )}

      <AnimatePresence>
        {interactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="dip-summary-row">
              <div className="dip-summary-card">
                <span className="dip-summary-num">{interactions.length}</span>
                <span className="dip-summary-label">Interactions Found</span>
              </div>
              {severityCounts.severe > 0 && (
                <div className="dip-summary-card dip-summary-severe">
                  <span className="dip-summary-num">{severityCounts.severe}</span>
                  <span className="dip-summary-label">Severe</span>
                </div>
              )}
              {severityCounts.moderate > 0 && (
                <div className="dip-summary-card dip-summary-moderate">
                  <span className="dip-summary-num">{severityCounts.moderate}</span>
                  <span className="dip-summary-label">Moderate</span>
                </div>
              )}
              {severityCounts.mild > 0 && (
                <div className="dip-summary-card dip-summary-mild">
                  <span className="dip-summary-num">{severityCounts.mild}</span>
                  <span className="dip-summary-label">Mild</span>
                </div>
              )}
            </div>

            <div className="dip-results-layout">
              <div className="dip-graph-section">
                <h3>Interaction Network</h3>
                <NetworkGraph drugs={drugs} interactions={interactions} />
              </div>

              <div className="dip-table-section">
                <h3>Interaction Details</h3>
                <div className="dip-table-wrap">
                  <table className="dip-table">
                    <thead>
                      <tr>
                        <th>Drug A</th>
                        <th>Drug B</th>
                        <th>Severity</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interactions.map((int, i) => (
                        <tr key={i}>
                          <td className="dip-td-drug">{int.drugA}</td>
                          <td className="dip-td-drug">{int.drugB}</td>
                          <td>
                            <span className={`di-sev-badge sev-${int.severity}`}>
                              {int.severity}
                            </span>
                          </td>
                          <td className="dip-td-desc">{int.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="dip-disclaimer">
              This tool provides informational data from NIH RxNav. It is not a substitute for
              professional medical advice. Always consult your healthcare provider before changing medications.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DrugInteractionPage;
