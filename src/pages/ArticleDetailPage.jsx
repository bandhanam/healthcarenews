import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ShareBar from '../components/ShareBar';
import { blank } from '../utils/blank';
import { normalizeCountry } from '../utils/countryNormalize';
import { getMatchingCategories, getCategoryLabel } from '../data/categories';
import { filterMedicalTags } from '../data/medicalKeywords';
import { pickCategoryImage } from '../data/categoryImages';
import './ArticleDetailPage.css';

function SentimentBadge({ sentiment }) {
  if (!sentiment) return null;
  const s = sentiment.toLowerCase();
  const cls = s === 'positive' ? 'positive' : s === 'negative' ? 'negative' : 'neutral';
  return <span className={`ad-sentiment ${cls}`}>{sentiment}</span>;
}

function ArticleDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const article = location.state?.article;

  if (!article) {
    return (
      <div className="ad-not-found">
        <h2>Article not found</h2>
        <p>This article is no longer available or the link is invalid.</p>
        <button className="ad-back-btn" onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          Back to News Feed
        </button>
      </div>
    );
  }

  const country = normalizeCountry(article.country);
  const categories = getMatchingCategories(article);
  const primaryCategory = categories.find((c) => c !== 'All') || 'Other';
  const categoryLabel = getCategoryLabel(primaryCategory);
  const medicalTags = filterMedicalTags(
    Array.isArray(article.tags) ? article.tags.map((t) => blank(t)).filter(Boolean) : []
  );

  const fullText = article.content || article.excerpt || '';
  const paragraphs = fullText.split(/\n{2,}/).filter(Boolean);
  let renderedParagraphs;
  if (paragraphs.length > 1) {
    renderedParagraphs = paragraphs.map((p, i) => <p key={i}>{p.trim()}</p>);
  } else {
    const sentences = fullText.replace(/\n+/g, ' ').trim().split(/(?<=\.)\s+/).filter(Boolean);
    const chunks = [];
    for (let i = 0; i < sentences.length; i += 3) {
      chunks.push(sentences.slice(i, i + 3).join(' '));
    }
    renderedParagraphs = chunks.map((c, i) => <p key={i}>{c}</p>);
  }

  const heroImage = pickCategoryImage(primaryCategory);

  return (
    <motion.div
      className="ad-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <button className="ad-back-btn" onClick={() => navigate(-1)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        Back
      </button>

      <div className="ad-hero">
        <img
          src={heroImage}
          alt={categoryLabel}
          className="ad-hero-img"
          loading="eager"
        />
        <div className="ad-hero-overlay">
          <Link to={`/category/${encodeURIComponent(primaryCategory)}`} className="ad-hero-category">
            {categoryLabel}
          </Link>
        </div>
      </div>

      <article className="ad-content-card">
        <header className="ad-header">
          <div className="ad-meta-row">
            {blank(article.date) && (
              <span className="ad-meta-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                {blank(article.date)}
              </span>
            )}
            {country && (
              <span className="ad-meta-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                {country}
              </span>
            )}
            {blank(article.company) && (
              <span className="ad-meta-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /></svg>
                {blank(article.company)}
              </span>
            )}
            <SentimentBadge sentiment={article.sentiment} />
          </div>

          <h1 className="ad-title">{blank(article.title)}</h1>

        </header>

        <div className="ad-body">
          {renderedParagraphs}
        </div>

        {medicalTags.length > 0 && (
          <div className="ad-tags-section">
            <h4 className="ad-tags-title">Related Topics</h4>
            <div className="ad-tags">
              {medicalTags.map((tag, i) => (
                <span key={i} className="ad-tag">{tag}</span>
              ))}
            </div>
          </div>
        )}

        <div className="ad-share-section">
          <h4 className="ad-share-title">Share this article</h4>
          <ShareBar url={article.url} title={article.title} text={article.excerpt} content={article.content} />
        </div>
      </article>
    </motion.div>
  );
}

export default ArticleDetailPage;
