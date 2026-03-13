import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchNewsByDateRange, getLatestMonthDates } from '../api';

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function cacheKey(s, e) { return `${s}__${e}`; }

function getCached(s, e) {
  const k = cacheKey(s, e);
  const entry = cache.get(k);
  if (entry && Date.now() - entry.ts < CACHE_TTL && entry.articles?.length > 0) return entry.articles;
  return null;
}

function setCache(s, e, articles) {
  cache.set(cacheKey(s, e), { articles, ts: Date.now() });
}

function dedup(articles) {
  const sorted = [...articles].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const seen = new Set();
  return sorted.filter((a) => {
    const key = (a.url || '').trim().toLowerCase().split('?')[0].replace(/\/+$/, '');
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function useArticles() {
  const defaults = getLatestMonthDates();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [articles, setArticlesState] = useState(getCached(defaults.startDate, defaults.endDate) || []);
  const [loading, setLoading] = useState(!getCached(defaults.startDate, defaults.endDate));
  const [error, setError] = useState(null);
  const loadIdRef = useRef(0);

  useEffect(() => {
    const cached = getCached(startDate, endDate);
    if (cached) {
      setArticlesState(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const loadId = ++loadIdRef.current;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchNewsByDateRange(startDate, endDate);
        if (cancelled || loadId !== loadIdRef.current) return;

        const loaded = response.articles ?? [];
        if (loaded.length === 0) {
          setArticlesState([]);
          setError('No articles found for the selected date range.');
          setLoading(false);
          return;
        }

        const deduped = dedup(loaded);
        setCache(startDate, endDate, deduped);

        if (!cancelled && loadId === loadIdRef.current) {
          setArticlesState(deduped);
          setError(null);
        }
      } catch (err) {
        if (!cancelled && loadId === loadIdRef.current) {
          setError(err.message || 'Failed to load articles');
          setArticlesState([]);
        }
      } finally {
        if (!cancelled && loadId === loadIdRef.current) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [startDate, endDate]);

  const setDateRange = useCallback((newStart, newEnd) => {
    setStartDate(newStart);
    setEndDate(newEnd);
  }, []);

  const setArticles = useCallback((newArticles) => {
    setCache(startDate, endDate, newArticles || []);
    setArticlesState(newArticles || []);
    setLoading(false);
    setError(null);
  }, [startDate, endDate]);

  return { articles, loading, error, startDate, endDate, setDateRange, setArticles };
}
