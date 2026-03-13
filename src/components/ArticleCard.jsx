import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ShareBar from './ShareBar';
import { blank } from '../utils/blank';
import { normalizeCountry } from '../utils/countryNormalize';
import { getMatchingCategories, getCategoryLabel } from '../data/categories';
import { filterMedicalTags } from '../data/medicalKeywords';
import { pickCategoryImage } from '../data/categoryImages';
import './ArticleCard.css';

function SentimentBadge({ sentiment }) {
  if (!sentiment) return null;
  const s = sentiment.toLowerCase();
  const cls = s === 'positive' ? 'positive' : s === 'negative' ? 'negative' : 'neutral';
  return <span className={`sentiment-badge ${cls}`}>{sentiment}</span>;
}

function ArticleCard({ article, index = 0 }) {
  const navigate = useNavigate();
  const country = normalizeCountry(article.country);
  const categories = getMatchingCategories(article);
  const categoryLabel = getCategoryLabel(categories.find((c) => c !== 'All') || 'Other');
  const medicalTags = filterMedicalTags(
    Array.isArray(article.tags) ? article.tags.map((t) => blank(t)).filter(Boolean) : []
  );

  const preview = (article.excerpt || article.content || '').replace(/\n+/g, ' ').trim();
  const primaryCategory = categories.find((c) => c !== 'All') || 'Other';
  const thumbImage = pickCategoryImage(primaryCategory);

  const handleReadMore = (e) => {
    e.stopPropagation();
    navigate(`/article/${article.id || index}`, { state: { article } });
  };

  const handleCardClick = () => {
    navigate(`/article/${article.id || index}`, { state: { article } });
  };

  return (
    <motion.article
      className="article-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
      onClick={handleCardClick}
    >
      <div className="ac-thumb">
        <img src={thumbImage} alt={categoryLabel} className="ac-thumb-img" loading="lazy" />
        <span className="ac-thumb-category">{categoryLabel}</span>
      </div>

      <div className="ac-body">
        <div className="ac-meta">
          {blank(article.date) && (
            <span className="ac-meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              {blank(article.date)}
            </span>
          )}
          {country && (
            <span className="ac-meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
              {country}
            </span>
          )}
          <SentimentBadge sentiment={article.sentiment} />
        </div>

        <h3 className="ac-title">{blank(article.title)}</h3>

        {preview && (
          <div className="ac-excerpt ac-excerpt--preview">
            <p>{preview}</p>
          </div>
        )}

        <button
          className="ac-read-toggle"
          onClick={handleReadMore}
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          Read full article
        </button>

        {medicalTags.length > 0 && (
          <div className="ac-tags">
            {medicalTags.slice(0, 5).map((tag, i) => (
              <span key={i} className="ac-tag">{tag}</span>
            ))}
          </div>
        )}

        <ShareBar url={article.url} title={article.title} text={article.excerpt} content={article.content} />
      </div>
    </motion.article>
  );
}

export default ArticleCard;
