import { Link, useParams } from 'react-router-dom';
import { useArticlesContext } from '../context/ArticlesContext';
import { CATEGORY_LIST, articleMatchesCategory } from '../data/categories';
import './Sidebar.css';

function Sidebar() {
  const { categoryName } = useParams();
  const { articles } = useArticlesContext();

  const getCategoryCount = (key) => {
    if (key === 'All') return articles.length;
    return articles.filter((a) => articleMatchesCategory(a, key)).length;
  };

  return (
    <aside className="sidebar">
      <h3 className="sidebar-title">Categories</h3>
      <nav className="sidebar-nav">
        {CATEGORY_LIST.map((cat) => {
          const count = getCategoryCount(cat.key);
          const isActive = cat.key === 'All'
            ? !categoryName || categoryName === 'All'
            : categoryName === cat.key;
          return (
            <Link
              key={cat.key}
              to={cat.key === 'All' ? '/' : `/category/${cat.key}`}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-link-label">{cat.label}</span>
              {count > 0 && <span className="sidebar-count">{count}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
