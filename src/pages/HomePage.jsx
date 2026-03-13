import { useState, useMemo } from 'react';
import { useArticlesContext } from '../context/ArticlesContext';
import SearchBar from '../components/SearchBar';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import DateRangeFilter from '../components/DateRangeFilter';
import ArticleCard from '../components/ArticleCard';
import Loader from '../components/Loader';
import { normalizeCountry } from '../utils/countryNormalize';
import { getMatchingCategories, getCategoryLabel } from '../data/categories';
import { DISEASES_AND_LOGIES, getCanonicalDiseaseLogyLabel, articleMatchesDiseasesOrLogies } from '../data/diseases';
import './HomePage.css';

function HomePage() {
  const { articles, loading, error, startDate, endDate, setDateRange } = useArticlesContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [selectedOrgs, setSelectedOrgs] = useState([]);
  const [selectedDiseases, setSelectedDiseases] = useState([]);

  const sorted = useMemo(() => [...articles].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)), [articles]);

  const availableCountries = useMemo(() => {
    const set = new Set();
    sorted.forEach((a) => { const c = normalizeCountry(a.country); if (c) set.add(c); });
    return [...set].sort();
  }, [sorted]);

  const availableOrgs = useMemo(() => {
    const set = new Set();
    sorted.forEach((a) => { if (a.company) set.add(String(a.company).trim()); });
    return [...set].filter(Boolean).sort();
  }, [sorted]);

  const availableDiseases = useMemo(() => {
    const seen = new Set();
    const textFrom = (a) => [a.title || '', a.excerpt || '', a.content || '', ...(a.tags || []), ...(a.keywords || [])].join(' ').toLowerCase();
    sorted.forEach((a) => {
      const text = textFrom(a);
      DISEASES_AND_LOGIES.forEach((term) => { if (text.includes(term.toLowerCase())) { const c = getCanonicalDiseaseLogyLabel(term); if (c) seen.add(c); } });
    });
    return [...seen].sort();
  }, [sorted]);

  const filtered = useMemo(() => {
    let list = sorted;
    if (selectedCountries.length > 0) list = list.filter((a) => { const c = normalizeCountry(a.country); return c && selectedCountries.includes(c); });
    if (selectedOrgs.length > 0) list = list.filter((a) => a.company && selectedOrgs.includes(String(a.company).trim()));
    if (selectedDiseases.length > 0) list = list.filter((a) => articleMatchesDiseasesOrLogies(a, selectedDiseases));
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter((a) => {
        const text = [a.title, a.excerpt, a.content, a.company, a.source, normalizeCountry(a.country), ...(a.tags || [])].filter(Boolean).join(' ').toLowerCase();
        return text.includes(term);
      });
    }
    return list;
  }, [sorted, searchTerm, selectedCountries, selectedOrgs, selectedDiseases]);

  const hasFilters = searchTerm || selectedCountries.length > 0 || selectedOrgs.length > 0 || selectedDiseases.length > 0;

  if (loading) return <Loader message="Loading healthcare news..." />;

  if (error) {
    return (
      <div className="page-error">
        <h2>Unable to load articles</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      <section className="hero-banner">
        <h1>Global Healthcare News</h1>
        <p>Stay informed with the latest healthcare, pharmaceutical, and biotech news from around the world.</p>
        <div className="hero-stats">
          <span className="hero-stat"><strong>{articles.length}</strong> articles</span>
          <span className="hero-stat"><strong>{availableCountries.length}</strong> countries</span>
        </div>
      </section>

      <section className="filters-panel">
        <h3 className="filters-title">Filters</h3>
        <div className="filters-date-row">
          <DateRangeFilter startDate={startDate} endDate={endDate} onChange={setDateRange} />
        </div>
        <div className="filters-grid">
          <MultiSelectDropdown label="Country" options={availableCountries} selectedValues={selectedCountries} onChange={setSelectedCountries} placeholder="All countries" />
          <MultiSelectDropdown label="Organization" options={availableOrgs} selectedValues={selectedOrgs} onChange={setSelectedOrgs} placeholder="All organizations" />
          <MultiSelectDropdown label="Disease / Specialty" options={availableDiseases} selectedValues={selectedDiseases} onChange={setSelectedDiseases} placeholder="All diseases" />
        </div>
        {hasFilters && (
          <div className="filters-active">
            Showing {filtered.length} of {sorted.length} articles
            {selectedCountries.length > 0 && <span className="filter-badge">{selectedCountries.length} countries</span>}
            {selectedOrgs.length > 0 && <span className="filter-badge">{selectedOrgs.length} orgs</span>}
            {selectedDiseases.length > 0 && <span className="filter-badge">{selectedDiseases.length} diseases</span>}
          </div>
        )}
      </section>

      <section className="articles-section">
        <div className="articles-header">
          <h2>Recent Articles</h2>
        </div>
        <SearchBar onSearch={setSearchTerm} placeholder="Search articles by title, content, organization, country..." />
        {filtered.length === 0 ? (
          <div className="no-results">
            <p>No articles match your filters. Try adjusting your criteria.</p>
          </div>
        ) : (
          <div className="articles-grid">
            {filtered.map((article, i) => (
              <ArticleCard key={article.id || i} article={article} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default HomePage;
