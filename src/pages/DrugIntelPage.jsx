import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DISEASE_LOGY_MAPPING, DISEASES_AND_LOGIES, CONDITIONS } from '../data/diseases';
import './DrugIntelPage.css';

const TABS = [
  { id: 'trialmap', label: 'TrialMap', icon: '🗺' },
  { id: 'approvals', label: 'ApprovalTracker', icon: '📋' },
  { id: 'competitor', label: 'CompetitorRadar', icon: '🎯' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'RECRUITING', label: 'Recruiting' },
  { value: 'ACTIVE_NOT_RECRUITING', label: 'Active, Not Recruiting' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'NOT_YET_RECRUITING', label: 'Not Yet Recruiting' },
  { value: 'ENROLLING_BY_INVITATION', label: 'Enrolling by Invitation' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'TERMINATED', label: 'Terminated' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'APPROVED_FOR_MARKETING', label: 'Approved for Marketing' },
];

const SOURCE_COLORS = { FDA: '#3b82f6', EMA: '#10b981', CDSCO: '#f59e0b' };
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const STATUS_CIRCLE_COLORS = {
  RECRUITING: { fill: '#22c55e', stroke: '#166534' },
  COMPLETED: { fill: '#3b82f6', stroke: '#1e40af' },
  ACTIVE_NOT_RECRUITING: { fill: '#f59e0b', stroke: '#92400e' },
  NOT_YET_RECRUITING: { fill: '#a78bfa', stroke: '#5b21b6' },
  TERMINATED: { fill: '#ef4444', stroke: '#991b1b' },
  WITHDRAWN: { fill: '#ef4444', stroke: '#991b1b' },
};
const DEFAULT_CIRCLE = { fill: '#94a3b8', stroke: '#475569' };

const PHASE_ORDER = ['EARLY_PHASE1', 'PHASE1', 'PHASE2', 'PHASE3', 'PHASE4', 'NA'];
const PHASE_LABELS = {
  EARLY_PHASE1: 'Early Phase 1',
  PHASE1: 'Phase 1',
  PHASE2: 'Phase 2',
  PHASE3: 'Phase 3',
  PHASE4: 'Phase 4',
  NA: 'Not Applicable',
};
const PHASE_COLORS = {
  EARLY_PHASE1: '#a78bfa',
  PHASE1: '#3b82f6',
  PHASE2: '#10b981',
  PHASE3: '#f59e0b',
  PHASE4: '#ef4444',
  NA: '#94a3b8',
};

const COMMON_DRUGS = [
  'Pembrolizumab', 'Nivolumab', 'Atezolizumab', 'Trastuzumab', 'Bevacizumab',
  'Metformin', 'Atorvastatin', 'Amlodipine', 'Omeprazole', 'Lisinopril',
  'Ibuprofen', 'Paracetamol', 'Aspirin', 'Remdesivir', 'Dexamethasone',
  'Rituximab', 'Adalimumab', 'Infliximab', 'Dupilumab', 'Semaglutide',
  'Ozempic', 'Wegovy', 'Keytruda', 'Opdivo', 'Herceptin',
];

const ALL_SUGGESTIONS = [
  ...DISEASE_LOGY_MAPPING.map((d) => d.label),
  ...DISEASES_AND_LOGIES,
  ...COMMON_DRUGS,
];
const UNIQUE_SUGGESTIONS = [...new Set(ALL_SUGGESTIONS)].sort();

function normalizePhase(phase) {
  if (!phase) return 'NA';
  const raw = Array.isArray(phase) ? phase[0] : phase;
  const p = String(raw).toUpperCase().replace(/\s+/g, '');
  if (p.includes('EARLY')) return 'EARLY_PHASE1';
  if (p.includes('4') || p === 'PHASE4') return 'PHASE4';
  if (p.includes('3') || p === 'PHASE3') return 'PHASE3';
  if (p.includes('2') || p === 'PHASE2') return 'PHASE2';
  if (p.includes('1') || p === 'PHASE1') return 'PHASE1';
  return 'NA';
}

function FitBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
  }, [markers, map]);
  return null;
}

function AutocompleteInput({ value, onChange, onSelect, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    if (!value || value.length < 1) return [];
    const q = value.toLowerCase();
    return UNIQUE_SUGGESTIONS.filter((s) => s.toLowerCase().includes(q)).slice(0, 12);
  }, [value]);

  useEffect(() => {
    setOpen(filtered.length > 0 && value.length >= 1);
    setHighlightIdx(-1);
  }, [filtered, value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const select = (val) => {
    onSelect(val);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      select(filtered[highlightIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (listRef.current && highlightIdx >= 0) {
      const el = listRef.current.children[highlightIdx];
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx]);

  return (
    <div className="di-autocomplete-wrap" ref={wrapRef}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (filtered.length > 0) setOpen(true); }}
        onKeyDown={handleKeyDown}
        className={className}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="di-autocomplete-dropdown" ref={listRef}>
          {filtered.map((item, i) => (
            <li
              key={item}
              className={`di-autocomplete-item ${i === highlightIdx ? 'highlighted' : ''}`}
              onMouseDown={() => select(item)}
              onMouseEnter={() => setHighlightIdx(i)}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MultiSelect({ options, selected, onChange, placeholder, label }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!filter) return options;
    const q = filter.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, filter]);

  const toggle = (item) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  };

  return (
    <div className="di-multiselect" ref={wrapRef}>
      <button
        type="button"
        className={`di-multiselect-trigger ${open ? 'open' : ''} ${selected.length > 0 ? 'has-selection' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span className="di-ms-label">
          {selected.length === 0 ? placeholder : `${selected.length} ${label} selected`}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`di-ms-chevron ${open ? 'open' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {selected.length > 0 && (
        <div className="di-ms-selected-chips">
          {selected.map((s) => (
            <span key={s} className="di-ms-chip">
              {s}
              <button type="button" className="di-ms-chip-remove" onClick={() => toggle(s)}>&times;</button>
            </span>
          ))}
          <button type="button" className="di-ms-clear-all" onClick={() => onChange([])}>Clear all</button>
        </div>
      )}
      {open && (
        <div className="di-ms-dropdown">
          <input
            type="text"
            className="di-ms-search"
            placeholder={`Search ${label}...`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoFocus
          />
          <div className="di-ms-options">
            {filtered.length === 0 && <div className="di-ms-empty">No matches found</div>}
            {filtered.map((item) => (
              <label key={item} className={`di-ms-option ${selected.includes(item) ? 'checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected.includes(item)}
                  onChange={() => toggle(item)}
                />
                <span className="di-ms-checkmark">
                  {selected.includes(item) && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  )}
                </span>
                <span className="di-ms-option-text">{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrialMapTab() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nextToken, setNextToken] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [searched, setSearched] = useState(false);

  const specialtyLabels = useMemo(() => DISEASE_LOGY_MAPPING.map((d) => d.label), []);

  const buildConditionQuery = useCallback(() => {
    const parts = [];
    selectedSpecialties.forEach((label) => {
      const entry = DISEASE_LOGY_MAPPING.find((d) => d.label === label);
      if (entry) parts.push(entry.keywords[0]);
    });
    selectedConditions.forEach((cond) => parts.push(cond));
    return parts.join(' OR ');
  }, [selectedSpecialties, selectedConditions]);

  const search = useCallback(
    async (append = false, token = null) => {
      const condQuery = buildConditionQuery();
      if (!query.trim() && !status && !condQuery) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (condQuery) params.set('condition', condQuery);
        if (status) params.set('status', status);
        params.set('pageSize', '50');
        if (token) params.set('pageToken', token);

        const res = await fetch(`/api/trials/search?${params}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setStudies((prev) => (append ? [...prev, ...data.studies] : data.studies));
        setNextToken(data.nextPageToken);
        setTotalCount(data.totalCount || 0);
        setSearched(true);
      } catch (err) {
        console.error('Trial search failed:', err);
      } finally {
        setLoading(false);
      }
    },
    [query, status, buildConditionQuery],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    search(false);
  };

  const handleConditionChip = (cond) => {
    setQuery(cond);
    setTimeout(() => {
      const form = document.querySelector('.di-trial-tab form');
      if (form) form.requestSubmit();
    }, 50);
  };

  const markers = studies.flatMap((s) =>
    (s.locations || [])
      .filter((loc) => loc.lat != null && loc.lng != null)
      .map((loc) => ({ lat: loc.lat, lng: loc.lng, study: s, loc })),
  );

  const countryCounts = {};
  studies.forEach((s) => {
    (s.locations || []).forEach((l) => {
      if (l.country) countryCounts[l.country] = (countryCounts[l.country] || 0) + 1;
    });
  });
  const countryData = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const phaseDistribution = useMemo(() => {
    const counts = {};
    studies.forEach((s) => {
      const key = normalizePhase(s.phase);
      counts[key] = (counts[key] || 0) + 1;
    });
    return PHASE_ORDER.filter((k) => counts[k]).map((k) => ({
      name: PHASE_LABELS[k],
      value: counts[k],
      color: PHASE_COLORS[k],
    }));
  }, [studies]);

  const statusDistribution = useMemo(() => {
    const counts = {};
    studies.forEach((s) => {
      const st = s.status || 'Unknown';
      counts[st] = (counts[st] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [studies]);

  const topConditions = useMemo(() => {
    const counts = {};
    studies.forEach((s) => {
      (s.conditions || []).forEach((c) => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [studies]);

  const phasePipeline = useMemo(() => {
    const groups = {};
    PHASE_ORDER.forEach((k) => { groups[k] = []; });
    studies.forEach((s) => {
      const key = normalizePhase(s.phase);
      groups[key].push(s);
    });
    return groups;
  }, [studies]);

  const quickSearchChips = [
    'Breast Cancer', 'Diabetes Mellitus', 'Alzheimer Disease', 'Hypertension',
    'Lung Cancer', 'Depression', 'Asthma', 'HIV/AIDS', 'Heart Failure',
    'Multiple Sclerosis', 'Parkinson Disease', 'Rheumatoid Arthritis',
    'Obesity', 'COPD', 'Stroke', 'Epilepsy',
  ];

  return (
    <div className="di-trial-tab">
      <div className="di-filter-section">
        <div className="di-filter-row-multi">
          <div className="di-filter-group">
            <span className="di-filter-label">Specialties</span>
            <MultiSelect
              options={specialtyLabels}
              selected={selectedSpecialties}
              onChange={setSelectedSpecialties}
              placeholder="All Specialties"
              label="specialties"
            />
          </div>
          <div className="di-filter-group">
            <span className="di-filter-label">Conditions</span>
            <MultiSelect
              options={CONDITIONS}
              selected={selectedConditions}
              onChange={setSelectedConditions}
              placeholder="All Conditions"
              label="conditions"
            />
          </div>
        </div>
      </div>

      <form className="di-search-bar" onSubmit={handleSubmit}>
        <AutocompleteInput
          value={query}
          onChange={setQuery}
          onSelect={(val) => setQuery(val)}
          placeholder="Search condition or drug (e.g., Diabetes, Pembrolizumab)..."
          className="di-search-input"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="di-select">
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button type="submit" className="di-btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Search Trials'}
        </button>
      </form>

      <div className="di-condition-chips-row">
        <span className="di-chips-label">Quick search:</span>
        {quickSearchChips.map((c) => (
          <button
            key={c}
            className={`di-chip ${query === c ? 'active' : ''}`}
            onClick={() => handleConditionChip(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {searched && (
        <div className="di-results-summary">
          Found <strong>{totalCount.toLocaleString()}</strong> trials
          {markers.length > 0 && ` · ${markers.length} map locations`}
        </div>
      )}

      <div className="di-map-container di-map-wide">
        <MapContainer center={[20, 0]} zoom={2} className="di-map" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.length > 0 && <FitBounds markers={markers} />}
          {markers.map((m, i) => {
            const colors = STATUS_CIRCLE_COLORS[m.study.status] || DEFAULT_CIRCLE;
            return (
              <CircleMarker
                key={`${m.study.nctId}-${i}`}
                center={[m.lat, m.lng]}
                radius={8}
                fillColor={colors.fill}
                fillOpacity={0.75}
                color={colors.stroke}
                weight={2}
              >
              <Popup maxWidth={320}>
                <div className="di-popup">
                  <strong>{m.study.title}</strong>
                  <div className="di-popup-meta">
                    <span className={`di-status-badge di-status-${(m.study.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                      {m.study.status}
                    </span>
                      {m.study.phase && (
                        <span className="di-phase-badge">
                          {Array.isArray(m.study.phase) ? m.study.phase.join(', ') : m.study.phase}
                        </span>
                      )}
                  </div>
                  <p className="di-popup-loc">
                    {[m.loc.facility, m.loc.city, m.loc.country].filter(Boolean).join(', ')}
                  </p>
                  {m.study.sponsor && <p className="di-popup-sponsor">Sponsor: {m.study.sponsor}</p>}
                  <a
                    href={`https://clinicaltrials.gov/study/${m.study.nctId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="di-popup-link"
                  >
                    View on ClinicalTrials.gov
                  </a>
                </div>
              </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
        {markers.length > 0 && (
          <div className="di-map-legend">
            <span className="di-legend-title">Status:</span>
            {Object.entries(STATUS_CIRCLE_COLORS).slice(0, 4).map(([key, val]) => (
              <span key={key} className="di-legend-item">
                <span className="di-legend-dot" style={{ background: val.fill }} />
                {key.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      {studies.length > 0 && (
        <div className="di-charts-grid di-charts-2x2">
      {countryData.length > 0 && (
        <div className="di-chart-section">
          <h3>Top Trial Locations</h3>
              <ResponsiveContainer width="100%" height={280}>
            <BarChart data={countryData} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
            </div>
          )}

          {phaseDistribution.length > 0 && (
            <div className="di-chart-section">
              <h3>Phase Distribution</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={phaseDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={40}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {phaseDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {statusDistribution.length > 0 && (
            <div className="di-chart-section">
              <h3>Status Distribution</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={40}
                    label={({ name, value }) => `${value}`}
                  >
                    {statusDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {topConditions.length > 0 && (
            <div className="di-chart-section">
              <h3>Top Conditions</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topConditions} layout="vertical" margin={{ left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {studies.length > 0 && (
        <div className="di-phase-pipeline-section">
          <h3>Phase Pipeline</h3>
          <p className="di-pipeline-subtitle">Drugs grouped by their current clinical trial phase</p>
          <div className="di-phase-pipeline">
            {PHASE_ORDER.map((phaseKey) => {
              const items = phasePipeline[phaseKey] || [];
              return (
                <div key={phaseKey} className="di-phase-column">
                  <div className="di-phase-header" style={{ borderTopColor: PHASE_COLORS[phaseKey] }}>
                    <span className="di-phase-header-label">{PHASE_LABELS[phaseKey]}</span>
                    <span className="di-phase-header-count">{items.length}</span>
                  </div>
                  <div className="di-phase-body">
                    {items.length === 0 && (
                      <div className="di-phase-empty">No trials</div>
                    )}
                    {items.slice(0, 15).map((s) => (
                      <div key={s.nctId} className="di-phase-drug-card">
                        <div className="di-phase-drug-title">{s.title}</div>
                        <div className="di-phase-drug-meta">
                          <span className="di-tag">{s.nctId}</span>
                          <span className={`di-status-badge di-status-${(s.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                            {s.status}
                          </span>
                        </div>
                        {s.sponsor && <div className="di-phase-drug-sponsor">{s.sponsor}</div>}
                      </div>
                    ))}
                    {items.length > 15 && (
                      <div className="di-phase-more">+{items.length - 15} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {nextToken && (
        <button className="di-btn-secondary di-load-more" onClick={() => search(true, nextToken)} disabled={loading}>
          {loading ? 'Loading...' : 'Load More Trials'}
        </button>
      )}

      {studies.length > 0 && (
        <div className="di-study-list">
          <h3>Trial Details</h3>
          {studies.slice(0, 20).map((s) => (
            <div key={s.nctId} className="di-study-card">
              <div className="di-study-header">
                <h4>{s.title}</h4>
                <span className={`di-status-badge di-status-${(s.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                  {s.status}
                </span>
              </div>
              <div className="di-study-meta">
                {s.nctId && <span className="di-tag">{s.nctId}</span>}
                {s.phase && (
                  <span className="di-tag di-tag-phase">
                    {Array.isArray(s.phase) ? s.phase.join(', ') : s.phase}
                  </span>
                )}
                {s.enrollmentCount && <span className="di-tag">n={s.enrollmentCount}</span>}
                {s.sponsor && <span className="di-tag di-tag-sponsor">{s.sponsor}</span>}
              </div>
              {s.conditions?.length > 0 && (
                <div className="di-study-conditions">
                  {s.conditions.map((c, i) => (
                    <span key={i} className="di-condition-chip">{c}</span>
                  ))}
                </div>
              )}
              {s.summary && <p className="di-study-summary">{s.summary}...</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalTrackerTab() {
  const [searchQ, setSearchQ] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/approvals/stats');
        const data = await res.json();
        if (!data.error) setStats(data);
      } catch { /* ignore */ }
      setStatsLoading(false);
    })();
  }, []);

  const searchApprovals = useCallback(
    async (newOffset = 0) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQ.trim()) params.set('q', searchQ.trim());
        if (sourceFilter) params.set('source', sourceFilter);
        if (categoryFilter) params.set('category', categoryFilter);
        params.set('limit', '50');
        params.set('offset', String(newOffset));

        const res = await fetch(`/api/approvals/search?${params}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setResults(data.results);
        setTotal(data.total);
        setOffset(newOffset);
      } catch (err) {
        console.error('Approval search failed:', err);
      } finally {
        setLoading(false);
      }
    },
    [searchQ, sourceFilter, categoryFilter],
  );

  useEffect(() => {
    searchApprovals(0);
  }, [searchApprovals]);

  const yearChartData = stats
    ? (() => {
        const grouped = {};
        stats.byYear.forEach((r) => {
          if (!grouped[r.year]) grouped[r.year] = { year: r.year };
          grouped[r.year][r.source] = r.count;
        });
        return Object.values(grouped)
          .sort((a, b) => a.year - b.year)
          .slice(-20);
      })()
    : [];

  const sourceChartData = stats
    ? stats.bySource.map((s) => ({ name: s.source, value: s.count }))
    : [];

  const areaChartData = useMemo(() => {
    if (!stats?.byArea) return [];
    return stats.byArea.slice(0, 10).map((a) => ({ name: a.area, count: a.count }));
  }, [stats]);

  return (
    <div className="di-approval-tab">
      {statsLoading ? (
        <div className="di-loading">Loading dashboard...</div>
      ) : stats ? (
        <div className="di-stats-row">
          <div className="di-stat-card di-stat-total">
            <span className="di-stat-num">{stats.totalCount?.toLocaleString()}</span>
            <span className="di-stat-label">Total Drug Approvals</span>
          </div>
          {stats.bySource.map((s) => (
            <div key={s.source} className="di-stat-card" style={{ borderColor: SOURCE_COLORS[s.source] }}>
              <span className="di-stat-num" style={{ color: SOURCE_COLORS[s.source] }}>
                {s.count.toLocaleString()}
              </span>
              <span className="di-stat-label">{s.source}</span>
            </div>
          ))}
        </div>
      ) : null}

      {yearChartData.length > 0 && (
        <div className="di-charts-grid di-charts-2x2">
          <div className="di-chart-section">
            <h3>Approvals by Year</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="FDA" fill={SOURCE_COLORS.FDA} stackId="a" radius={[2, 2, 0, 0]} />
                <Bar dataKey="EMA" fill={SOURCE_COLORS.EMA} stackId="a" />
                <Bar dataKey="CDSCO" fill={SOURCE_COLORS.CDSCO} stackId="a" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="di-chart-section">
            <h3>By Source</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourceChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                >
                  {sourceChartData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {areaChartData.length > 0 && (
            <div className="di-chart-section di-chart-span-2">
              <h3>Top Therapeutic Areas</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={areaChartData} layout="vertical" margin={{ left: 160 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="di-approval-search">
        <h3>Search Drug Approvals</h3>
        <form
          className="di-search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            searchApprovals(0);
          }}
        >
          <AutocompleteInput
            value={searchQ}
            onChange={setSearchQ}
            onSelect={(val) => setSearchQ(val)}
            placeholder="Search drug name, generic name, or substance..."
            className="di-search-input"
          />
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="di-select">
            <option value="">All Sources</option>
            <option value="FDA">FDA (US)</option>
            <option value="EMA">EMA (EU)</option>
            <option value="CDSCO">CDSCO (India)</option>
          </select>
          <button type="submit" className="di-btn-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {stats?.byArea && (
          <div className="di-category-chips">
            <button
              className={`di-chip ${!categoryFilter ? 'active' : ''}`}
              onClick={() => { setCategoryFilter(''); }}
            >
              All
            </button>
            {stats.byArea.slice(0, 12).map((a) => (
              <button
                key={a.area}
                className={`di-chip ${categoryFilter === a.area ? 'active' : ''}`}
                onClick={() => setCategoryFilter(categoryFilter === a.area ? '' : a.area)}
              >
                {a.area} ({a.count.toLocaleString()})
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="di-results-summary">
        Showing {results.length} of <strong>{total.toLocaleString()}</strong> results
      </div>

      <div className="di-approval-table-wrap">
        <table className="di-approval-table">
          <thead>
            <tr>
              <th>Drug Name</th>
              <th>Generic / Substance</th>
              <th>Source</th>
              <th>Approval Date</th>
              <th>Therapeutic Area</th>
              <th>Manufacturer</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={`${r.source}-${r.source_id}-${i}`}>
                <td className="di-td-name">{r.drug_name}</td>
                <td className="di-td-generic">
                  {r.generic_name || r.active_substance || '-'}
                </td>
                <td>
                  <span className="di-source-badge" style={{ background: SOURCE_COLORS[r.source] || '#666' }}>
                    {r.source}
                  </span>
                </td>
                <td>{r.approval_date ? new Date(r.approval_date).toLocaleDateString() : '-'}</td>
                <td>{r.therapeutic_area || '-'}</td>
                <td className="di-td-mfr">{r.manufacturer || '-'}</td>
                <td>{r.application_type || '-'}</td>
              </tr>
            ))}
            {results.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="di-empty-row">No results found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > results.length + offset && (
        <div className="di-pagination">
          {offset > 0 && (
            <button className="di-btn-secondary" onClick={() => searchApprovals(Math.max(0, offset - 50))}>
              Previous
            </button>
          )}
          <span className="di-page-info">
            {offset + 1}-{Math.min(offset + results.length, total)} of {total.toLocaleString()}
          </span>
          <button className="di-btn-secondary" onClick={() => searchApprovals(offset + 50)} disabled={loading}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

const MARKET_REGIONS = [
  { key: 'US', label: 'United States', color: '#3b82f6', countries: ['United States'] },
  { key: 'EU', label: 'Europe', color: '#10b981', countries: ['Germany', 'France', 'United Kingdom', 'Spain', 'Italy', 'Netherlands', 'Belgium', 'Sweden', 'Denmark', 'Poland', 'Austria', 'Switzerland', 'Norway', 'Finland', 'Ireland', 'Czech Republic', 'Portugal', 'Greece', 'Hungary', 'Romania'] },
  { key: 'IN', label: 'India', color: '#f59e0b', countries: ['India'] },
  { key: 'CN', label: 'China', color: '#ef4444', countries: ['China'] },
  { key: 'JP', label: 'Japan', color: '#8b5cf6', countries: ['Japan'] },
  { key: 'KR', label: 'South Korea', color: '#ec4899', countries: ['Korea, Republic of', 'South Korea'] },
  { key: 'AU', label: 'Australia', color: '#14b8a6', countries: ['Australia'] },
  { key: 'OTHER', label: 'Rest of World', color: '#94a3b8', countries: [] },
];

function classifyRegion(country) {
  if (!country) return 'OTHER';
  for (const r of MARKET_REGIONS) {
    if (r.countries.some((c) => c.toLowerCase() === country.toLowerCase())) return r.key;
  }
  return 'OTHER';
}

function CompetitorRadarTab() {
  const [query, setQuery] = useState('');
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [competitors, setCompetitors] = useState([]);
  const [competitorsLoading, setCompetitorsLoading] = useState(false);
  const [expandedSponsor, setExpandedSponsor] = useState(null);

  const searchCompetitors = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setCompetitorsLoading(true);
    setStudies([]);
    setCompetitors([]);

    try {
      const [trialsRes, approvalsRes] = await Promise.all([
        fetch(`/api/trials/search?q=${encodeURIComponent(query.trim())}&pageSize=50`),
        fetch(`/api/approvals/competitors?category=${encodeURIComponent(query.trim())}&limit=20`),
      ]);

      const trialsData = await trialsRes.json();
      if (!trialsData.error) {
        setStudies(trialsData.studies || []);
        setTotalCount(trialsData.totalCount || 0);
      }

      const appData = await approvalsRes.json();
      if (!appData.error) {
        setCompetitors(appData.competitors || []);
      }

      setSearched(true);
    } catch (err) {
      console.error('Competitor search failed:', err);
    } finally {
      setLoading(false);
      setCompetitorsLoading(false);
    }
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    searchCompetitors();
  };

  const sponsorData = useMemo(() => {
    const map = {};
    studies.forEach((s) => {
      if (!s.sponsor) return;
      if (!map[s.sponsor]) {
        map[s.sponsor] = {
          sponsor: s.sponsor,
          total: 0,
          phases: { EARLY_PHASE1: 0, PHASE1: 0, PHASE2: 0, PHASE3: 0, PHASE4: 0, NA: 0 },
          statuses: {},
          regions: {},
          conditions: {},
          trials: [],
        };
      }
      const entry = map[s.sponsor];
      entry.total++;
      entry.phases[normalizePhase(s.phase)]++;

      const st = s.status || 'Unknown';
      entry.statuses[st] = (entry.statuses[st] || 0) + 1;

      (s.locations || []).forEach((loc) => {
        const region = classifyRegion(loc.country);
        entry.regions[region] = (entry.regions[region] || 0) + 1;
      });

      (s.conditions || []).forEach((c) => {
        entry.conditions[c] = (entry.conditions[c] || 0) + 1;
      });

      if (entry.trials.length < 8) entry.trials.push(s);
    });

    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 15);
  }, [studies]);

  const regionSummary = useMemo(() => {
    const counts = {};
    studies.forEach((s) => {
      (s.locations || []).forEach((loc) => {
        const region = classifyRegion(loc.country);
        counts[region] = (counts[region] || 0) + 1;
      });
    });
    return MARKET_REGIONS.filter((r) => counts[r.key]).map((r) => ({
      ...r,
      count: counts[r.key] || 0,
    }));
  }, [studies]);

  const topSponsorChart = useMemo(() => {
    return sponsorData.slice(0, 10).map((s) => ({
      name: s.sponsor.length > 25 ? s.sponsor.slice(0, 25) + '...' : s.sponsor,
      fullName: s.sponsor,
      trials: s.total,
      Phase1: s.phases.PHASE1 + s.phases.EARLY_PHASE1,
      Phase2: s.phases.PHASE2,
      Phase3: s.phases.PHASE3,
      Phase4: s.phases.PHASE4,
    }));
  }, [sponsorData]);

  const regionChartData = useMemo(() => {
    return regionSummary.map((r) => ({ name: r.label, value: r.count, color: r.color }));
  }, [regionSummary]);

  return (
    <div className="di-competitor-tab">
      <div className="cr-intro">
        <h3>Competitive Landscape Analysis</h3>
        <p>Enter a disease or therapeutic area to see which companies are competing, their pipeline phases, and global market presence across US, EU, India, China, Japan, and more.</p>
      </div>

      <form className="di-search-bar" onSubmit={handleSubmit}>
        <AutocompleteInput
          value={query}
          onChange={setQuery}
          onSelect={(val) => setQuery(val)}
          placeholder="Enter disease or therapeutic area (e.g., Cancer, Diabetes, Alzheimer)..."
          className="di-search-input"
        />
        <button type="submit" className="di-btn-primary" disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze Competition'}
        </button>
      </form>

      <div className="di-condition-chips-row">
        <span className="di-chips-label">Popular:</span>
        {['Cancer', 'Diabetes', 'Alzheimer', 'Cardiology', 'Immunology', 'Oncology', 'Neurology', 'Infectious Disease'].map((c) => (
          <button
            key={c}
            className={`di-chip ${query === c ? 'active' : ''}`}
            onClick={() => { setQuery(c); }}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && (
        <div className="di-loading">
          Scanning global clinical trials and regulatory approvals...
        </div>
      )}

      {searched && !loading && (
        <>
          <div className="di-results-summary">
            Found <strong>{totalCount.toLocaleString()}</strong> clinical trials
            {sponsorData.length > 0 && ` from ${sponsorData.length} sponsors`}
            {competitors.length > 0 && ` + ${competitors.length} companies with approved drugs`}
          </div>

          {regionSummary.length > 0 && (
            <div className="cr-region-cards">
              <h3>Global Market Presence</h3>
              <div className="cr-region-grid">
                {regionSummary.map((r) => (
                  <div key={r.key} className="cr-region-card" style={{ borderTopColor: r.color }}>
                    <span className="cr-region-flag">{
                      { US: '🇺🇸', EU: '🇪🇺', IN: '🇮🇳', CN: '🇨🇳', JP: '🇯🇵', KR: '🇰🇷', AU: '🇦🇺', OTHER: '🌍' }[r.key]
                    }</span>
                    <span className="cr-region-name">{r.label}</span>
                    <span className="cr-region-count">{r.count.toLocaleString()}</span>
                    <span className="cr-region-label">trial sites</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topSponsorChart.length > 0 && (
            <div className="di-charts-grid di-charts-2x2">
              <div className="di-chart-section">
                <h3>Top Competitors by Trial Count</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={topSponsorChart} layout="vertical" margin={{ left: 180 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(val, name) => [val, name]} />
                    <Legend />
                    <Bar dataKey="Phase1" stackId="a" fill={PHASE_COLORS.PHASE1} />
                    <Bar dataKey="Phase2" stackId="a" fill={PHASE_COLORS.PHASE2} />
                    <Bar dataKey="Phase3" stackId="a" fill={PHASE_COLORS.PHASE3} />
                    <Bar dataKey="Phase4" stackId="a" fill={PHASE_COLORS.PHASE4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="di-chart-section">
                <h3>Trial Sites by Region</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={regionChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={50}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {regionChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {sponsorData.length > 0 && (
            <div className="cr-pipeline-section">
              <h3>Pipeline Comparison</h3>
              <p className="di-pipeline-subtitle">Phase breakdown for each competitor based on ClinicalTrials.gov data</p>
              <div className="cr-pipeline-table-wrap">
                <table className="cr-pipeline-table">
                  <thead>
                    <tr>
                      <th>Company / Sponsor</th>
                      <th>Phase 1</th>
                      <th>Phase 2</th>
                      <th>Phase 3</th>
                      <th>Phase 4</th>
                      <th>Total</th>
                      <th>Regions</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sponsorData.map((s) => {
                      const isExpanded = expandedSponsor === s.sponsor;
                      const regionKeys = Object.keys(s.regions);
                      return (
                        <React.Fragment key={s.sponsor}>
                          <tr className={isExpanded ? 'cr-row-expanded' : ''}>
                            <td className="cr-td-sponsor">{s.sponsor}</td>
                            <td><span className="cr-phase-cell" style={{ background: s.phases.PHASE1 + s.phases.EARLY_PHASE1 > 0 ? '#dbeafe' : 'transparent' }}>{s.phases.PHASE1 + s.phases.EARLY_PHASE1 || '-'}</span></td>
                            <td><span className="cr-phase-cell" style={{ background: s.phases.PHASE2 > 0 ? '#d1fae5' : 'transparent' }}>{s.phases.PHASE2 || '-'}</span></td>
                            <td><span className="cr-phase-cell" style={{ background: s.phases.PHASE3 > 0 ? '#fef3c7' : 'transparent' }}>{s.phases.PHASE3 || '-'}</span></td>
                            <td><span className="cr-phase-cell" style={{ background: s.phases.PHASE4 > 0 ? '#fee2e2' : 'transparent' }}>{s.phases.PHASE4 || '-'}</span></td>
                            <td className="cr-td-total"><strong>{s.total}</strong></td>
                            <td className="cr-td-regions">
                              {regionKeys.slice(0, 4).map((rk) => {
                                const flag = { US: '🇺🇸', EU: '🇪🇺', IN: '🇮🇳', CN: '🇨🇳', JP: '🇯🇵', KR: '🇰🇷', AU: '🇦🇺', OTHER: '🌍' }[rk] || '🌍';
                                return <span key={rk} className="cr-region-flag-sm" title={rk}>{flag}</span>;
                              })}
                              {regionKeys.length > 4 && <span className="cr-region-more">+{regionKeys.length - 4}</span>}
                            </td>
                            <td>
                              <button
                                className="cr-expand-btn"
                                onClick={() => setExpandedSponsor(isExpanded ? null : s.sponsor)}
                              >
                                {isExpanded ? '▲' : '▼'}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="cr-detail-row">
                              <td colSpan={8}>
                                <div className="cr-detail-content">
                                  <div className="cr-detail-trials">
                                    <h4>Recent Trials</h4>
                                    {s.trials.map((t) => (
                                      <div key={t.nctId} className="cr-detail-trial-card">
                                        <div className="cr-detail-trial-title">{t.title}</div>
                                        <div className="cr-detail-trial-meta">
                                          <span className="di-tag">{t.nctId}</span>
                                          <span className={`di-status-badge di-status-${(t.status || '').toLowerCase().replace(/\s+/g, '-')}`}>{t.status}</span>
                                          {t.phase && <span className="di-phase-badge">{Array.isArray(t.phase) ? t.phase.join(', ') : t.phase}</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="cr-detail-regions">
                                    <h4>Geographic Presence</h4>
                                    <div className="cr-detail-region-bars">
                                      {Object.entries(s.regions).sort((a, b) => b[1] - a[1]).map(([rk, cnt]) => {
                                        const reg = MARKET_REGIONS.find((r) => r.key === rk);
                                        const maxCnt = Math.max(...Object.values(s.regions));
                                        return (
                                          <div key={rk} className="cr-detail-region-row">
                                            <span className="cr-detail-region-label">{reg?.label || rk}</span>
                                            <div className="cr-detail-region-bar-track">
                                              <div
                                                className="cr-detail-region-bar-fill"
                                                style={{ width: `${(cnt / maxCnt) * 100}%`, background: reg?.color || '#94a3b8' }}
                                              />
                                            </div>
                                            <span className="cr-detail-region-count">{cnt}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {competitors.length > 0 && (
            <div className="cr-approvals-section">
              <h3>Approved Drug Competitors</h3>
              <p className="di-pipeline-subtitle">Companies with approved drugs from FDA, EMA, and CDSCO in this area</p>
              <div className="cr-approval-cards">
                {competitors.slice(0, 12).map((c) => (
                  <div key={c.manufacturer} className="cr-approval-card">
                    <div className="cr-approval-header">
                      <span className="cr-approval-name">{c.manufacturer}</span>
                      <span className="cr-approval-total">{c.total} approved</span>
                    </div>
                    <div className="cr-approval-sources">
                      {Object.entries(c.bySrc || {}).map(([src, cnt]) => (
                        <span key={src} className="di-source-badge" style={{ background: SOURCE_COLORS[src] || '#666' }}>
                          {src}: {cnt}
                        </span>
                      ))}
                    </div>
                    {c.drugs && c.drugs.length > 0 && (
                      <div className="cr-approval-drugs">
                        {c.drugs.slice(0, 5).map((d, i) => (
                          <div key={i} className="cr-approval-drug-row">
                            <span className="cr-drug-name">{d.drug_name}</span>
                            {d.approval_date && <span className="cr-drug-date">{new Date(d.approval_date).getFullYear()}</span>}
                          </div>
                        ))}
                        {c.drugs.length > 5 && <div className="cr-drug-more">+{c.drugs.length - 5} more</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DrugIntelPage() {
  const [activeTab, setActiveTab] = useState('trialmap');

  return (
    <div className="di-page">
      <motion.div
        className="di-hero"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="di-title">Drug Intelligence Dashboard</h1>
        <p className="di-subtitle">
          Real-time clinical trials from ClinicalTrials.gov and drug approvals from FDA, EMA, and
          CDSCO -- powered by live public APIs.
        </p>
      </motion.div>

      <div className="di-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`di-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="di-tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="di-tab-content"
        >
          {activeTab === 'trialmap' && <TrialMapTab />}
          {activeTab === 'approvals' && <ApprovalTrackerTab />}
          {activeTab === 'competitor' && <CompetitorRadarTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default DrugIntelPage;
