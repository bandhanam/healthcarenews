import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useArticlesContext } from '../context/ArticlesContext';
import './OutbreakRadarPage.css';

const Q = ['#7c3aed','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#6d28d9','#5b21b6','#4c1d95','#ec4899','#f43f5e'];
const SEVERITY_COLORS = { critical: '#ef4444', high: '#f97316', moderate: '#f59e0b', low: '#10b981' };

const OUTBREAK_DISEASES = [
  { name: 'COVID-19', keywords: ['covid', 'coronavirus', 'sars-cov', 'omicron', 'pandemic'], icon: '\uD83E\uDDA0', severity: 'moderate' },
  { name: 'Influenza', keywords: ['flu', 'influenza', 'h1n1', 'h5n1', 'avian flu', 'bird flu'], icon: '\uD83E\uDD27', severity: 'moderate' },
  { name: 'Dengue', keywords: ['dengue'], icon: '\uD83E\uDD9F', severity: 'high' },
  { name: 'Malaria', keywords: ['malaria'], icon: '\uD83E\uDD9F', severity: 'high' },
  { name: 'Tuberculosis', keywords: ['tuberculosis', 'tb'], icon: '\uD83E\uDEC1', severity: 'high' },
  { name: 'Ebola', keywords: ['ebola'], icon: '\u2620\uFE0F', severity: 'critical' },
  { name: 'Monkeypox', keywords: ['monkeypox', 'mpox'], icon: '\uD83D\uDC12', severity: 'moderate' },
  { name: 'Cholera', keywords: ['cholera'], icon: '\uD83D\uDCA7', severity: 'high' },
  { name: 'Measles', keywords: ['measles'], icon: '\uD83D\uDD34', severity: 'moderate' },
  { name: 'HIV/AIDS', keywords: ['hiv', 'aids'], icon: '\uD83C\uDF97\uFE0F', severity: 'high' },
  { name: 'Hepatitis', keywords: ['hepatitis'], icon: '\uD83E\uDEB3', severity: 'moderate' },
  { name: 'Zika', keywords: ['zika'], icon: '\uD83E\uDD9F', severity: 'moderate' },
];

const REGION_COORDS = {
  'United States': [39.8, -98.5], 'China': [35.8, 104.1], 'India': [20.5, 78.9],
  'Brazil': [-14.2, -51.9], 'UK': [55.3, -3.4], 'Germany': [51.1, 10.4],
  'France': [46.2, 2.2], 'Japan': [36.2, 138.2], 'Australia': [-25.2, 133.7],
  'South Africa': [-30.5, 22.9], 'Nigeria': [9.0, 8.6], 'Kenya': [-0.02, 37.9],
  'Mexico': [23.6, -102.5], 'Canada': [56.1, -106.3], 'Russia': [61.5, 105.3],
  'Indonesia': [-0.7, 113.9], 'Thailand': [15.8, 100.9], 'Egypt': [26.8, 30.8],
};

function classifyOutbreak(text) {
  const lower = (text || '').toLowerCase();
  for (const disease of OUTBREAK_DISEASES) {
    if (disease.keywords.some(k => lower.includes(k))) return disease;
  }
  return null;
}

function extractRegion(text) {
  const lower = (text || '').toLowerCase();
  for (const [region, coords] of Object.entries(REGION_COORDS)) {
    if (lower.includes(region.toLowerCase())) return { region, coords };
  }
  return null;
}

function FitBounds({ locations }) {
  const map = useMap();
  useMemo(() => {
    if (locations.length === 0) return;
    const bounds = L.latLngBounds(locations.map((l) => l.coords));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 4 });
  }, [locations, map]);
  return null;
}

function AlertCard({ alert, index }) {
  const sColor = SEVERITY_COLORS[alert.severity] || '#94a3b8';
  return (
    <motion.div
      className="or-alert-card"
      style={{ borderLeftColor: sColor }}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <div className="or-alert-header">
        <span className="or-alert-icon">{alert.icon}</span>
        <div className="or-alert-info">
          <h4>{alert.disease}</h4>
          <span className="or-alert-severity" style={{ background: `${sColor}18`, color: sColor }}>{alert.severity}</span>
        </div>
      </div>
      <p className="or-alert-title">{alert.title}</p>
      {alert.region && <span className="or-alert-region">{alert.region}</span>}
      <span className="or-alert-source">{alert.source} &middot; {alert.date}</span>
    </motion.div>
  );
}

function OutbreakRadarPage() {
  const { articles, loading: articlesLoading } = useArticlesContext();
  const [filter, setFilter] = useState('all');

  const outbreakAlerts = useMemo(() => {
    const alerts = [];
    articles.forEach((a) => {
      const text = `${a.title || ''} ${a.description || ''}`;
      const disease = classifyOutbreak(text);
      if (!disease) return;
      const regionInfo = extractRegion(text);
      alerts.push({
        disease: disease.name,
        icon: disease.icon,
        severity: disease.severity,
        title: a.title,
        source: a.source?.name || 'Unknown',
        date: a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : '',
        region: regionInfo?.region || null,
        coords: regionInfo?.coords || null,
      });
    });
    return alerts;
  }, [articles]);

  const filtered = useMemo(() => {
    if (filter === 'all') return outbreakAlerts;
    return outbreakAlerts.filter((a) => a.disease === filter);
  }, [outbreakAlerts, filter]);

  const diseaseDistribution = useMemo(() => {
    const map = {};
    outbreakAlerts.forEach((a) => { map[a.disease] = (map[a.disease] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [outbreakAlerts]);

  const severityDistribution = useMemo(() => {
    const map = {};
    outbreakAlerts.forEach((a) => { map[a.severity] = (map[a.severity] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, key: name }));
  }, [outbreakAlerts]);

  const regionDistribution = useMemo(() => {
    const map = {};
    outbreakAlerts.forEach((a) => { if (a.region) map[a.region] = (map[a.region] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [outbreakAlerts]);

  const mapMarkers = useMemo(() => {
    const map = {};
    outbreakAlerts.forEach((a) => {
      if (!a.coords) return;
      const key = `${a.coords[0]}_${a.coords[1]}`;
      if (!map[key]) map[key] = { coords: a.coords, region: a.region, diseases: {}, count: 0, severity: a.severity };
      map[key].diseases[a.disease] = (map[key].diseases[a.disease] || 0) + 1;
      map[key].count += 1;
      if (['critical', 'high'].includes(a.severity) && !['critical', 'high'].includes(map[key].severity)) {
        map[key].severity = a.severity;
      }
    });
    return Object.values(map);
  }, [outbreakAlerts]);

  const radarData = useMemo(() => {
    return diseaseDistribution.slice(0, 8).map(d => ({
      ...d,
      fullMark: Math.max(...diseaseDistribution.map(c => c.value), 1),
    }));
  }, [diseaseDistribution]);

  const timelineData = useMemo(() => {
    const map = {};
    outbreakAlerts.forEach((a) => {
      if (!a.date) return;
      map[a.date] = (map[a.date] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => new Date(a) - new Date(b)).slice(-14).map(([date, count]) => ({ date, alerts: count }));
  }, [outbreakAlerts]);

  const uniqueDiseases = useMemo(() => [...new Set(outbreakAlerts.map(a => a.disease))], [outbreakAlerts]);

  return (
    <div className="or-page">
      <div className="or-hero">
        <span className="or-hero-badge">
          <span className="or-radar-dot" />OutbreakRadar
        </span>
        <h1 className="or-title">Disease Outbreak Intelligence</h1>
        <p className="or-subtitle">AI-powered monitoring of global disease outbreaks from live healthcare news feeds</p>
      </div>

      <div className="or-summary-row">
        <div className="or-summary-card" style={{ borderColor: '#ef4444' }}>
          <span className="or-sum-val" style={{ color: '#ef4444' }}>{outbreakAlerts.filter(a => a.severity === 'critical').length}</span>
          <span className="or-sum-label">Critical</span>
        </div>
        <div className="or-summary-card" style={{ borderColor: '#f97316' }}>
          <span className="or-sum-val" style={{ color: '#f97316' }}>{outbreakAlerts.filter(a => a.severity === 'high').length}</span>
          <span className="or-sum-label">High</span>
        </div>
        <div className="or-summary-card" style={{ borderColor: '#f59e0b' }}>
          <span className="or-sum-val" style={{ color: '#f59e0b' }}>{outbreakAlerts.filter(a => a.severity === 'moderate').length}</span>
          <span className="or-sum-label">Moderate</span>
        </div>
        <div className="or-summary-card" style={{ borderColor: '#10b981' }}>
          <span className="or-sum-val" style={{ color: '#10b981' }}>{outbreakAlerts.filter(a => a.severity === 'low').length}</span>
          <span className="or-sum-label">Low</span>
        </div>
        <div className="or-summary-card" style={{ borderColor: '#7c3aed' }}>
          <span className="or-sum-val" style={{ color: '#7c3aed' }}>{outbreakAlerts.length}</span>
          <span className="or-sum-label">Total Alerts</span>
        </div>
      </div>

      {articlesLoading ? (
        <div className="or-loading">
          <div className="or-pulse-wrap"><div className="or-pulse-anim" /><div className="or-pulse-anim or-p2" /><span>{'\uD83D\uDCE1'}</span></div>
          <p>Scanning global feeds for outbreak signals...</p>
        </div>
      ) : (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {mapMarkers.length > 0 && (
              <motion.div className="or-map-section" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h3 className="or-section-title">Global Outbreak Map</h3>
                <div className="or-map-container">
                  <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom={false} style={{ height: '100%', width: '100%', borderRadius: 14 }}>
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    />
                    <FitBounds locations={mapMarkers} />
                    {mapMarkers.map((m, i) => (
                      <CircleMarker
                        key={i}
                        center={m.coords}
                        radius={Math.min(6 + m.count * 3, 22)}
                        fillColor={SEVERITY_COLORS[m.severity] || '#7c3aed'}
                        color={SEVERITY_COLORS[m.severity] || '#7c3aed'}
                        weight={2}
                        opacity={0.8}
                        fillOpacity={0.5}
                      >
                        <Popup>
                          <strong>{m.region}</strong><br />
                          {Object.entries(m.diseases).map(([d, c]) => (
                            <span key={d}>{d}: {c} alerts<br /></span>
                          ))}
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                </div>
              </motion.div>
            )}

            <div className="or-charts-grid">
              {timelineData.length > 0 && (
                <motion.div className="or-chart-card or-span-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="or-chart-title">Alert Timeline</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={timelineData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="orArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Area type="monotone" dataKey="alerts" stroke="#7c3aed" fill="url(#orArea)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {diseaseDistribution.length > 0 && (
                <motion.div className="or-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="or-chart-title">Disease Distribution</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={diseaseDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {diseaseDistribution.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {severityDistribution.length > 0 && (
                <motion.div className="or-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="or-chart-title">Severity Breakdown</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={severityDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {severityDistribution.map((d, i) => <Cell key={i} fill={SEVERITY_COLORS[d.key] || Q[i % Q.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {radarData.length > 2 && (
                <motion.div className="or-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="or-chart-title">Threat Radar</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--color-border, #e2e8f0)" />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <PolarRadiusAxis tick={{ fontSize: 9 }} />
                      <Radar dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {regionDistribution.length > 0 && (
                <motion.div className="or-chart-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="or-chart-title">Affected Regions</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={regionDistribution} layout="vertical" margin={{ left: 70, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text, #1e293b)' }} width={65} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
                      <Bar dataKey="value" name="Alerts" radius={[0, 6, 6, 0]}>
                        {regionDistribution.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </div>

            <div className="or-alerts-section">
              <div className="or-alerts-header">
                <h3 className="or-section-title">Outbreak Alerts</h3>
                <div className="or-filter-row">
                  <button className={`or-filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
                  {uniqueDiseases.map((d) => (
                    <button key={d} className={`or-filter-btn ${filter === d ? 'active' : ''}`} onClick={() => setFilter(d)}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="or-alerts-grid">
                {filtered.slice(0, 20).map((a, i) => <AlertCard key={i} alert={a} index={i} />)}
                {filtered.length === 0 && (
                  <div className="or-empty">No outbreak alerts detected in current feed for this filter.</div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export default OutbreakRadarPage;
