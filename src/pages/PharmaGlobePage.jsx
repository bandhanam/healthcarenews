import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Treemap,
} from 'recharts';
import './PharmaGlobePage.css';

const Q = ['#4f46e5','#6366f1','#818cf8','#a5b4fc','#c7d2fe','#4338ca','#3730a3','#312e81','#8b5cf6','#7c3aed'];

const COUNTRIES = {
  US:  { name: 'United States', x: 180, y: 135, body: 'FDA' },
  GB:  { name: 'United Kingdom', x: 380, y: 105, body: 'MHRA' },
  DE:  { name: 'Germany', x: 405, y: 108, body: 'BfArM' },
  FR:  { name: 'France', x: 390, y: 118, body: 'ANSM' },
  CH:  { name: 'Switzerland', x: 400, y: 115, body: 'Swissmedic' },
  JP:  { name: 'Japan', x: 660, y: 130, body: 'PMDA' },
  CN:  { name: 'China', x: 610, y: 135, body: 'NMPA' },
  IN:  { name: 'India', x: 560, y: 165, body: 'CDSCO' },
  AU:  { name: 'Australia', x: 660, y: 240, body: 'TGA' },
  BR:  { name: 'Brazil', x: 260, y: 220, body: 'ANVISA' },
  CA:  { name: 'Canada', x: 170, y: 105, body: 'Health Canada' },
  KR:  { name: 'South Korea', x: 645, y: 130, body: 'MFDS' },
  EU:  { name: 'EU (EMA)', x: 395, y: 112, body: 'EMA' },
  ZA:  { name: 'South Africa', x: 430, y: 240, body: 'SAHPRA' },
  MX:  { name: 'Mexico', x: 160, y: 165, body: 'COFEPRIS' },
  RU:  { name: 'Russia', x: 500, y: 95, body: 'Roszdravnadzor' },
  SG:  { name: 'Singapore', x: 615, y: 190, body: 'HSA' },
  IL:  { name: 'Israel', x: 460, y: 140, body: 'MOH' },
};

const CONTINENT_PATHS = [
  { id: 'na', d: 'M100,80 L220,80 L250,120 L230,180 L150,200 L120,160 L100,120Z', label: 'N. America' },
  { id: 'sa', d: 'M200,200 L280,190 L310,240 L280,290 L230,280 L210,240Z', label: 'S. America' },
  { id: 'eu', d: 'M360,80 L440,75 L450,110 L430,130 L370,125 L355,100Z', label: 'Europe' },
  { id: 'af', d: 'M380,140 L460,135 L470,200 L450,260 L400,260 L370,200Z', label: 'Africa' },
  { id: 'as', d: 'M460,70 L680,75 L680,180 L600,200 L520,170 L450,130Z', label: 'Asia' },
  { id: 'oc', d: 'M620,210 L700,200 L710,260 L660,270 L620,250Z', label: 'Oceania' },
];

function StatCard({ icon, label, value, color }) {
  return (
    <motion.div className="pg-stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="pg-stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="pg-stat-body">
        <span className="pg-stat-val">{value}</span>
        <span className="pg-stat-label">{label}</span>
      </div>
    </motion.div>
  );
}

function GlobeMap({ data, onCountryClick, selectedCountry }) {
  const maxCount = useMemo(() => Math.max(...Object.values(data).map(d => d.count), 1), [data]);

  return (
    <div className="pg-globe-wrap">
      <svg viewBox="0 0 780 320" className="pg-globe-svg">
        <defs>
          <radialGradient id="pgOcean" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#312e81" stopOpacity="0.05" />
          </radialGradient>
          <filter id="pgGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width="780" height="320" fill="url(#pgOcean)" rx="14" />

        {CONTINENT_PATHS.map((c) => (
          <g key={c.id}>
            <path d={c.d} fill="var(--color-border, #e2e8f0)" opacity="0.25" stroke="var(--color-border, #e2e8f0)" strokeWidth="0.5" />
          </g>
        ))}

        {Object.entries(COUNTRIES).map(([code, c]) => {
          const d = data[code] || data[c.body] || { count: 0 };
          const r = 4 + (d.count / maxCount) * 14;
          const isSelected = selectedCountry === code;
          return (
            <g key={code} onClick={() => onCountryClick(code)} style={{ cursor: 'pointer' }}>
              {d.count > 0 && (
                <circle cx={c.x} cy={c.y} r={r + 6} fill={Q[0]} opacity="0.08">
                  <animate attributeName="r" values={`${r + 4};${r + 10};${r + 4}`} dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.12;0.03;0.12" dur="3s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={c.x} cy={c.y} r={r} fill={isSelected ? '#f59e0b' : Q[0]} opacity={d.count > 0 ? 0.8 : 0.2} stroke={isSelected ? '#f59e0b' : '#fff'} strokeWidth={isSelected ? 2.5 : 1} filter={d.count > 2 ? 'url(#pgGlow)' : undefined} />
              <text x={c.x} y={c.y - r - 5} textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--color-text, #1e293b)" opacity="0.7">{c.name.length > 12 ? code : c.name}</text>
              {d.count > 0 && (
                <text x={c.x} y={c.y + 3.5} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fff">{d.count}</text>
              )}
            </g>
          );
        })}

        {Object.entries(data).length > 1 && (() => {
          const codes = Object.keys(data).filter(k => COUNTRIES[k] && data[k]?.count > 0);
          const lines = [];
          for (let i = 0; i < codes.length && i < 6; i++) {
            for (let j = i + 1; j < codes.length && j < 6; j++) {
              const a = COUNTRIES[codes[i]], b = COUNTRIES[codes[j]];
              if (a && b) lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, key: `${codes[i]}-${codes[j]}` });
            }
          }
          return lines.map((l) => (
            <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={Q[0]} strokeWidth="0.5" opacity="0.15" strokeDasharray="4 4">
              <animate attributeName="stroke-dashoffset" values="0;8" dur="2s" repeatCount="indefinite" />
            </line>
          ));
        })()}
      </svg>
    </div>
  );
}

function PharmaGlobePage() {
  const [loading, setLoading] = useState(false);
  const [approvals, setApprovals] = useState([]);
  const [trials, setTrials] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [autoLoaded, setAutoLoaded] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [appRes, triRes] = await Promise.allSettled([
        fetch('/api/approvals/stats').then(r => r.ok ? r.json() : null),
        fetch('/api/trials/search?condition=drug&pageSize=80').then(r => r.ok ? r.json() : null),
      ]);
      if (appRes.status === 'fulfilled' && appRes.value?.results) setApprovals(appRes.value.results);
      if (triRes.status === 'fulfilled' && triRes.value?.studies) setTrials(triRes.value.studies);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!autoLoaded) { setAutoLoaded(true); loadData(); }
  }, [autoLoaded, loadData]);

  const countryData = useMemo(() => {
    const map = {};
    approvals.forEach((a) => {
      const body = a.regulatory_body || a.region || 'Unknown';
      Object.entries(COUNTRIES).forEach(([code, c]) => {
        if (body.toLowerCase().includes(c.body.toLowerCase()) || body.toLowerCase().includes(c.name.toLowerCase())) {
          if (!map[code]) map[code] = { count: 0, drugs: new Set(), bodies: new Set() };
          map[code].count += 1;
          if (a.drug_name) map[code].drugs.add(a.drug_name);
          map[code].bodies.add(body);
        }
      });
    });
    return map;
  }, [approvals]);

  const regionChart = useMemo(() => {
    return Object.entries(countryData).map(([code, d]) => ({
      name: COUNTRIES[code]?.name || code,
      approvals: d.count,
    })).sort((a, b) => b.approvals - a.approvals).slice(0, 10);
  }, [countryData]);

  const bodyDistribution = useMemo(() => {
    const map = {};
    approvals.forEach((a) => { const b = a.regulatory_body || 'Other'; map[b] = (map[b] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name: name.length > 18 ? name.substring(0, 15) + '...' : name, value }));
  }, [approvals]);

  const yearlyData = useMemo(() => {
    const map = {};
    approvals.forEach((a) => {
      if (!a.approval_date) return;
      const yr = new Date(a.approval_date).getFullYear();
      if (yr > 2000) map[yr] = (map[yr] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a - b).map(([year, count]) => ({ year: String(year), count }));
  }, [approvals]);

  const therapeuticMap = useMemo(() => {
    const map = {};
    approvals.forEach((a) => {
      const area = a.therapeutic_area || a.product_type || 'Other';
      map[area] = (map[area] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, size]) => ({ name: name.length > 18 ? name.substring(0, 15) + '...' : name, size }));
  }, [approvals]);

  const trialPhases = useMemo(() => {
    const map = {};
    trials.forEach((t) => {
      const phases = t.protocolSection?.designModule?.phases || ['NA'];
      phases.forEach((p) => {
        const label = p.replace('EARLY_PHASE1', 'Early Ph1').replace('PHASE', 'Phase ').replace('NA', 'N/A');
        map[label] = (map[label] || 0) + 1;
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [trials]);

  const selectedInfo = selectedCountry && COUNTRIES[selectedCountry] ? {
    ...COUNTRIES[selectedCountry],
    data: countryData[selectedCountry] || { count: 0, drugs: new Set(), bodies: new Set() },
  } : null;

  return (
    <div className="pg-page">
      <div className="pg-hero">
        <span className="pg-hero-badge">PharmaGlobe</span>
        <h1 className="pg-title">Global Pharma Intelligence Map</h1>
        <p className="pg-subtitle">Interactive visualization of worldwide drug approvals, regulatory bodies, and clinical trial activity</p>
      </div>

      <div className="pg-stats-row">
        <StatCard icon={'\uD83C\uDF0D'} label="Countries" value={Object.keys(countryData).length} color="#4f46e5" />
        <StatCard icon={'\u2705'} label="Approvals" value={approvals.length.toLocaleString()} color="#10b981" />
        <StatCard icon={'\uD83E\uDDEA'} label="Trials" value={trials.length.toLocaleString()} color="#3b82f6" />
        <StatCard icon={'\uD83C\uDFED'} label="Regulators" value={bodyDistribution.length} color="#8b5cf6" />
      </div>

      {loading ? (
        <div className="pg-loading">
          <div className="pg-pulse-wrap"><div className="pg-pulse" /><div className="pg-pulse pg-p2" /><span>{'\uD83C\uDF10'}</span></div>
          <p>Loading global pharma data...</p>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="pg-map-section" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="pg-section-title">Interactive Approval Map</h3>
              <p className="pg-map-hint">Click any country node to see details</p>
              <GlobeMap data={countryData} onCountryClick={setSelectedCountry} selectedCountry={selectedCountry} />
            </motion.div>

            {selectedInfo && (
              <motion.div className="pg-country-detail" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="pg-detail-header">
                  <h3>{selectedInfo.name}</h3>
                  <span className="pg-detail-body">{selectedInfo.body}</span>
                </div>
                <div className="pg-detail-stats">
                  <span><strong>{selectedInfo.data.count}</strong> Approvals</span>
                  <span><strong>{selectedInfo.data.drugs?.size || 0}</strong> Unique Drugs</span>
                </div>
                {selectedInfo.data.drugs?.size > 0 && (
                  <div className="pg-detail-drugs">
                    {[...selectedInfo.data.drugs].slice(0, 12).map((d) => (
                      <span key={d} className="pg-drug-chip">{d}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            <div className="pg-charts-grid">
              {regionChart.length > 0 && (
                <motion.div className="pg-chart-card pg-span-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="pg-chart-title">Approvals by Country</h3>
                  <ResponsiveContainer width="100%" height={Math.max(180, regionChart.length * 28)}>
                    <BarChart data={regionChart} layout="vertical" margin={{ left: 90, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text, #1e293b)' }} width={85} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Bar dataKey="approvals" radius={[0, 6, 6, 0]}>
                        {regionChart.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {bodyDistribution.length > 0 && (
                <motion.div className="pg-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="pg-chart-title">Regulatory Bodies</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={bodyDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {bodyDistribution.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {trialPhases.length > 0 && (
                <motion.div className="pg-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="pg-chart-title">Global Trial Phases</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={trialPhases} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {trialPhases.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {yearlyData.length > 0 && (
                <motion.div className="pg-chart-card pg-span-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="pg-chart-title">Approval Trend Over Years</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={yearlyData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="pgArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Area type="monotone" dataKey="count" stroke="#4f46e5" fill="url(#pgArea)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {therapeuticMap.length > 0 && (
                <motion.div className="pg-chart-card pg-span-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="pg-chart-title">Therapeutic Area Landscape</h3>
                  <div className="pg-treemap-grid">
                    {therapeuticMap.map((t, i) => {
                      const maxSize = Math.max(...therapeuticMap.map(x => x.size), 1);
                      const pct = (t.size / maxSize) * 100;
                      return (
                        <motion.div key={t.name} className="pg-tree-cell" style={{ background: `${Q[i % Q.length]}15`, borderColor: Q[i % Q.length] }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.03 }}>
                          <div className="pg-tree-bar" style={{ width: `${pct}%`, background: Q[i % Q.length] }} />
                          <span className="pg-tree-name">{t.name}</span>
                          <span className="pg-tree-count" style={{ color: Q[i % Q.length] }}>{t.size}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export default PharmaGlobePage;
