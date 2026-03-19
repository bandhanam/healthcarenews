import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import './ProviderDirectoryPage.css';

const API_BASE = '/api/providers';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

const CREDENTIALS = ['MD', 'DO', 'NP', 'PA', 'RN', 'DDS', 'DMD', 'DPM', 'DC', 'OD', 'PharmD'];

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6'
];

const STATE_NAMES = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'Washington DC'
};

const DEFAULT_PAGE_CONFIG = {
  pageTitle: 'Advanced Provider Dashboard',
  pageBadge: 'Provider Intelligence',
  pageSubtitle: 'Search, segment, and analyze NPI data across physicians, hospitals, specialties, and geography',
  searchTabLabel: 'Search Providers',
  analyticsTabLabel: 'Analytics Dashboard',
  mapTabLabel: 'Heat Map',
  searchPlaceholder: 'Search by name, NPI, specialty, or organization...',
  defaultTab: 'search',
  fixedEntityType: '',
  showEntityTypeFilter: true,
};

function ProviderDirectoryPage({ config: pageConfig = {} }) {
  const page = { ...DEFAULT_PAGE_CONFIG, ...pageConfig };
  const [activeTab, setActiveTab] = useState(page.defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    state: '',
    city: '',
    credential: '',
    entityType: page.fixedEntityType || ''
  });
  const [providers, setProviders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, currentPage: 1 });
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [exporting, setExporting] = useState(false);
  const effectiveEntityType = page.fixedEntityType || filters.entityType;

  // Fetch analytics on mount
  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async (state = '', credential = '') => {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams();
      if (state) params.append('state', state);
      if (credential) params.append('credential', credential);
      if (effectiveEntityType) params.append('entity_type', effectiveEntityType);
      
      const response = await fetch(`${API_BASE}/analytics?${params}`);
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const searchProviders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: ((page - 1) * 20).toString()
      });
      
      if (searchQuery) params.append('q', searchQuery);
      if (filters.state) params.append('state', filters.state);
      if (filters.city) params.append('city', filters.city);
      if (filters.credential) params.append('credential', filters.credential);
      if (effectiveEntityType) params.append('entity_type', effectiveEntityType);

      const response = await fetch(`${API_BASE}/search?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setProviders(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters]);

  const handleSearch = (e) => {
    e.preventDefault();
    searchProviders(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ limit: '1000' });
      if (searchQuery) params.append('q', searchQuery);
      if (filters.state) params.append('state', filters.state);
      if (filters.city) params.append('city', filters.city);
      if (filters.credential) params.append('credential', filters.credential);
      if (effectiveEntityType) params.append('entity_type', effectiveEntityType);

      const response = await fetch(`${API_BASE}/export?${params}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `providers_${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({ state: '', city: '', credential: '', entityType: page.fixedEntityType || '' });
    setProviders([]);
    setPagination({ total: 0, pages: 1, currentPage: 1 });
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString() || '0';
  };

  const formatPhone = (phone) => {
    if (!phone) return '-';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="provider-directory-page">
      {/* Hero Section */}
      <section className="provider-hero">
        <motion.div 
          className="hero-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="hero-badge">
            <span className="badge-icon">🏥</span>
            <span>{page.pageBadge}</span>
          </div>
          <h1>{page.pageTitle}</h1>
          <p>
            {page.pageSubtitle} <strong>{formatNumber(analytics?.summary?.totalProviders || 0)}</strong> records
          </p>
          
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-value">{formatNumber(analytics?.summary?.individuals || 0)}</span>
              <span className="stat-label">Individuals</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{formatNumber(analytics?.summary?.organizations || 0)}</span>
              <span className="stat-label">Organizations</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">50+</span>
              <span className="stat-label">States</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">100+</span>
              <span className="stat-label">Specialties</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <span className="tab-icon">🔍</span>
          {page.searchTabLabel}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <span className="tab-icon">📊</span>
          {page.analyticsTabLabel}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <span className="tab-icon">🗺️</span>
          {page.mapTabLabel}
        </button>
      </div>

      {/* Search Tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'search' && (
          <motion.section 
            className="search-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Search Form */}
            <form className="search-form" onSubmit={handleSearch}>
              <div className="search-main">
                <div className="search-input-wrapper">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder={page.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>
                <button type="submit" className="search-btn" disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>

              <div className="filters-row">
                <select 
                  value={filters.state} 
                  onChange={(e) => setFilters({...filters, state: e.target.value})}
                  className="filter-select"
                >
                  <option value="">All States</option>
                  {US_STATES.map(s => (
                    <option key={s} value={s}>{STATE_NAMES[s] || s}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="City"
                  value={filters.city}
                  onChange={(e) => setFilters({...filters, city: e.target.value})}
                  className="filter-input"
                />

                <select 
                  value={filters.credential} 
                  onChange={(e) => setFilters({...filters, credential: e.target.value})}
                  className="filter-select"
                >
                  <option value="">All Credentials</option>
                  {CREDENTIALS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {page.showEntityTypeFilter && !page.fixedEntityType && (
                  <select 
                    value={filters.entityType} 
                    onChange={(e) => setFilters({...filters, entityType: e.target.value})}
                    className="filter-select"
                  >
                    <option value="">All Types</option>
                    <option value="1">Individual</option>
                    <option value="2">Organization</option>
                  </select>
                )}

                <button type="button" className="clear-btn" onClick={clearFilters}>
                  Clear
                </button>
              </div>
            </form>

            {/* Results */}
            {providers.length > 0 && (
              <div className="results-section">
                <div className="results-header">
                  <span className="results-count">
                    Found <strong>{pagination.total.toLocaleString()}</strong> providers
                  </span>
                  <button 
                    className="export-btn" 
                    onClick={handleExport}
                    disabled={exporting}
                  >
                    {exporting ? '⏳ Exporting...' : '📥 Export CSV'}
                  </button>
                </div>

                <div className="providers-grid">
                  {providers.map((provider, idx) => (
                    <motion.div
                      key={provider.npi}
                      className="provider-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => setSelectedProvider(provider)}
                    >
                      <div className="provider-header">
                        <div className="provider-avatar">
                          {provider.entityType === 'Individual' ? '👤' : '🏢'}
                        </div>
                        <div className="provider-info">
                          <h3 className="provider-name">{provider.name || 'N/A'}</h3>
                          <span className="provider-credential">{provider.credential || provider.entityType}</span>
                        </div>
                      </div>
                      <div className="provider-details">
                        <div className="detail-row">
                          <span className="detail-icon">📍</span>
                          <span>{provider.city}, {provider.state} {provider.zip}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-icon">📞</span>
                          <span>{formatPhone(provider.phone)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-icon">🏷️</span>
                          <span>NPI: {provider.npi}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="pagination">
                    <button 
                      disabled={pagination.currentPage === 1}
                      onClick={() => searchProviders(pagination.currentPage - 1)}
                      className="page-btn"
                    >
                      ← Previous
                    </button>
                    <span className="page-info">
                      Page {pagination.currentPage} of {pagination.pages}
                    </span>
                    <button 
                      disabled={pagination.currentPage === pagination.pages}
                      onClick={() => searchProviders(pagination.currentPage + 1)}
                      className="page-btn"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!loading && providers.length === 0 && searchQuery && (
              <div className="empty-state">
                <span className="empty-icon">🔍</span>
                <h3>No providers found</h3>
                <p>Try adjusting your search criteria</p>
              </div>
            )}
          </motion.section>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <motion.section 
            className="analytics-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {analyticsLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading analytics...</p>
              </div>
            ) : analytics && (
              <>
                {/* Summary Cards */}
                <div className="summary-cards">
                  <div className="summary-card purple">
                    <span className="card-icon">👥</span>
                    <div className="card-content">
                      <span className="card-value">{formatNumber(analytics.summary.totalProviders)}</span>
                      <span className="card-label">Total Providers</span>
                    </div>
                  </div>
                  <div className="summary-card blue">
                    <span className="card-icon">👤</span>
                    <div className="card-content">
                      <span className="card-value">{formatNumber(analytics.summary.individuals)}</span>
                      <span className="card-label">Individuals</span>
                    </div>
                  </div>
                  <div className="summary-card green">
                    <span className="card-icon">🏢</span>
                    <div className="card-content">
                      <span className="card-value">{formatNumber(analytics.summary.organizations)}</span>
                      <span className="card-label">Organizations</span>
                    </div>
                  </div>
                  <div className="summary-card orange">
                    <span className="card-icon">🗺️</span>
                    <div className="card-content">
                      <span className="card-value">{Object.keys(analytics.mapData || {}).length}</span>
                      <span className="card-label">States Covered</span>
                    </div>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="charts-grid">
                  {/* By State Chart */}
                  <div className="chart-card">
                    <h3 className="chart-title">
                      <span className="chart-icon">📊</span>
                      Top States by Provider Count
                    </h3>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.byState.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tickFormatter={formatNumber} />
                          <YAxis type="category" dataKey="state" width={40} />
                          <Tooltip 
                            formatter={(value) => [value.toLocaleString(), 'Providers']}
                            contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                          />
                          <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Entity Type Pie Chart */}
                  <div className="chart-card">
                    <h3 className="chart-title">
                      <span className="chart-icon">🥧</span>
                      Entity Type Distribution
                    </h3>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={analytics.byEntityType}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            innerRadius={60}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {analytics.byEntityType.map((entry, index) => (
                              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => value.toLocaleString()} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Credentials Chart */}
                  <div className="chart-card">
                    <h3 className="chart-title">
                      <span className="chart-icon">🎓</span>
                      Top Credentials
                    </h3>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.byCredential.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="credential" angle={-45} textAnchor="end" height={80} />
                          <YAxis tickFormatter={formatNumber} />
                          <Tooltip 
                            formatter={(value) => [value.toLocaleString(), 'Providers']}
                            contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                          />
                          <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top Cities */}
                  <div className="chart-card">
                    <h3 className="chart-title">
                      <span className="chart-icon">🏙️</span>
                      Top Cities
                    </h3>
                    <div className="cities-list">
                      {analytics.byCity.slice(0, 10).map((city, idx) => (
                        <div key={idx} className="city-row">
                          <span className="city-rank">{idx + 1}</span>
                          <span className="city-name">{city.city}, {city.state}</span>
                          <span className="city-count">{formatNumber(city.count)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.section>
        )}

        {/* Map Tab */}
        {activeTab === 'map' && (
          <motion.section 
            className="map-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="map-container">
              <h3 className="map-title">
                <span className="map-icon">🗺️</span>
                Provider Distribution by State
              </h3>
              <div className="state-grid">
                {analytics && Object.entries(analytics.mapData || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([state, count]) => {
                    const maxCount = Math.max(...Object.values(analytics.mapData));
                    const intensity = Math.min(count / maxCount, 1);
                    const bgColor = `rgba(0, 76, 151, ${0.15 + intensity * 0.7})`;
                    
                    return (
                      <motion.div
                        key={state}
                        className="state-tile"
                        style={{ backgroundColor: bgColor }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => {
                          setFilters({ ...filters, state });
                          setActiveTab('search');
                          setTimeout(() => searchProviders(1), 100);
                        }}
                      >
                        <span className="state-code">{state}</span>
                        <span className="state-count">{formatNumber(count)}</span>
                      </motion.div>
                    );
                  })}
              </div>
              <div className="map-legend">
                <span className="legend-low">Low</span>
                <div className="legend-gradient"></div>
                <span className="legend-high">High</span>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Provider Detail Modal */}
      <AnimatePresence>
        {selectedProvider && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedProvider(null)}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setSelectedProvider(null)}>×</button>
              <div className="modal-header">
                <div className="modal-avatar">
                  {selectedProvider.entityType === 'Individual' ? '👤' : '🏢'}
                </div>
                <div>
                  <h2>{selectedProvider.name}</h2>
                  <span className="modal-type">{selectedProvider.entityType}</span>
                </div>
              </div>
              <div className="modal-body">
                <div className="modal-row">
                  <span className="modal-label">NPI</span>
                  <span className="modal-value npi-value">{selectedProvider.npi}</span>
                </div>
                <div className="modal-row">
                  <span className="modal-label">Credential</span>
                  <span className="modal-value">{selectedProvider.credential || '-'}</span>
                </div>
                <div className="modal-row">
                  <span className="modal-label">Specialty</span>
                  <span className="modal-value">{selectedProvider.specialty || '-'}</span>
                </div>
                <div className="modal-row">
                  <span className="modal-label">Address</span>
                  <span className="modal-value">
                    {selectedProvider.address}<br />
                    {selectedProvider.city}, {selectedProvider.state} {selectedProvider.zip}
                  </span>
                </div>
                <div className="modal-row">
                  <span className="modal-label">Phone</span>
                  <span className="modal-value">{formatPhone(selectedProvider.phone)}</span>
                </div>
                <div className="modal-row">
                  <span className="modal-label">Last Updated</span>
                  <span className="modal-value">{selectedProvider.lastUpdated || '-'}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProviderDirectoryPage;
