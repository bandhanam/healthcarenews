import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useArticlesContext } from '../context/ArticlesContext';
import SearchBar from '../components/SearchBar';
import DateRangeFilter from '../components/DateRangeFilter';
import ArticleCard from '../components/ArticleCard';
import Loader from '../components/Loader';
import { articleMatchesCategory, getCategoryLabel } from '../data/categories';
import './CategoryPage.css';

function CategoryPage() {
  const { categoryName } = useParams();
  const { articles, loading, startDate, endDate, setDateRange } = useArticlesContext();
  const [searchTerm, setSearchTerm] = useState('');

  const categoryArticles = useMemo(() => {
    return articles.filter((a) => articleMatchesCategory(a, categoryName))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [articles, categoryName]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return categoryArticles;
    const term = searchTerm.toLowerCase().trim();
    return categoryArticles.filter((a) => {
      const text = [a.title, a.excerpt, a.content, a.company, a.source].filter(Boolean).join(' ').toLowerCase();
      return text.includes(term);
    });
  }, [categoryArticles, searchTerm]);

  const label = getCategoryLabel(categoryName);

  if (loading) return <Loader message={`Loading ${label}...`} />;

  return (
    <div className="category-page">
      <div className="category-header">
        <h1>{label}</h1>
        <span className="category-count">{filtered.length} article{filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="category-date-filter">
        <DateRangeFilter startDate={startDate} endDate={endDate} onChange={setDateRange} />
      </div>
      <SearchBar onSearch={setSearchTerm} placeholder={`Search in ${label}...`} />
      {filtered.length === 0 ? (
        <div className="no-results"><p>No articles found in this category.</p></div>
      ) : (
        <div className="articles-grid">
          {filtered.map((a, i) => <ArticleCard key={a.id || i} article={a} index={i} />)}
        </div>
      )}
    </div>
  );
}

export default CategoryPage;
