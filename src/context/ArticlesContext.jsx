import { createContext, useContext, useMemo } from 'react';
import { useArticles } from '../hooks/useArticles';

const ArticlesContext = createContext(null);

export function ArticlesProvider({ children }) {
  const { articles, loading, error, startDate, endDate, setDateRange, setArticles } = useArticles();
  const value = useMemo(
    () => ({ articles, loading, error, startDate, endDate, setDateRange, setArticles }),
    [articles, loading, error, startDate, endDate, setDateRange, setArticles],
  );
  return <ArticlesContext.Provider value={value}>{children}</ArticlesContext.Provider>;
}

export function useArticlesContext() {
  const ctx = useContext(ArticlesContext);
  if (!ctx) throw new Error('useArticlesContext must be used within ArticlesProvider');
  return {
    articles: ctx.articles || [],
    loading: ctx.loading !== undefined ? ctx.loading : true,
    error: ctx.error || null,
    startDate: ctx.startDate || '',
    endDate: ctx.endDate || '',
    setDateRange: ctx.setDateRange || (() => {}),
    setArticles: ctx.setArticles || (() => {}),
  };
}
