import { useState, useCallback, useEffect, useRef } from 'react';
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
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './DrugIntelPage.css';

const TABS = [
  { id: 'trialmap', label: 'TrialMap', icon: '🗺' },
  { id: 'approvals', label: 'ApprovalTracker', icon: '📋' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'RECRUITING', label: 'Recruiting' },
  { value: 'ACTIVE_NOT_RECRUITING', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'NOT_YET_RECRUITING', label: 'Not Yet Recruiting' },
];

const SOURCE_COLORS = { FDA: '#3b82f6', EMA: '#10b981', CDSCO: '#f59e0b' };
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const trialIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function FitBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
  }, [markers, map]);
  return null;
}

// ---------------------------------------------------------------------------
// TrialMap Tab
// ---------------------------------------------------------------------------

function TrialMapTab() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nextToken, setNextToken] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback(
    async (append = false, token = null) => {
      if (!query.trim() && !status) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
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
    [query, status],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    search(false);
  };

  const markers = studies.flatMap((s) =>
    (s.locations || [])
      .filter((loc) => loc.lat != null && loc.lng != null)
      .map((loc) => ({
        lat: loc.lat,
        lng: loc.lng,
        study: s,
        loc,
      })),
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

  return (
    <div className="di-trial-tab">
      <form className="di-search-bar" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Search condition or drug (e.g., Diabetes, Pembrolizumab)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="di-search-input"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="di-select">
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button type="submit" className="di-btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Search Trials'}
        </button>
      </form>

      {searched && (
        <div className="di-results-summary">
          Found <strong>{totalCount.toLocaleString()}</strong> trials
          {markers.length > 0 && ` · ${markers.length} map locations`}
        </div>
      )}

      <div className="di-map-container">
        <MapContainer center={[20, 0]} zoom={2} className="di-map" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.length > 0 && <FitBounds markers={markers} />}
          {markers.map((m, i) => (
            <Marker key={`${m.study.nctId}-${i}`} position={[m.lat, m.lng]} icon={trialIcon}>
              <Popup maxWidth={320}>
                <div className="di-popup">
                  <strong>{m.study.title}</strong>
                  <div className="di-popup-meta">
                    <span className={`di-status-badge di-status-${(m.study.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                      {m.study.status}
                    </span>
                    {m.study.phase && <span className="di-phase-badge">{Array.isArray(m.study.phase) ? m.study.phase.join(', ') : m.study.phase}</span>}
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
            </Marker>
          ))}
        </MapContainer>
      </div>

      {countryData.length > 0 && (
        <div className="di-chart-section">
          <h3>Top Trial Locations</h3>
          <ResponsiveContainer width="100%" height={300}>
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

// ---------------------------------------------------------------------------
// ApprovalTracker Tab
// ---------------------------------------------------------------------------

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
        <div className="di-charts-grid">
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
          <input
            type="text"
            placeholder="Search drug name, generic name, or substance..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
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

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

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
          {activeTab === 'trialmap' ? <TrialMapTab /> : <ApprovalTrackerTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default DrugIntelPage;
