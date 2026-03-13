import { describe, it, expect } from 'vitest';
import { blank } from '../utils/blank';
import { normalizeCountry } from '../utils/countryNormalize';
import { articleMatchesCategory, getCategoryLabel } from '../data/categories';

describe('blank utility', () => {
  it('returns empty string for null/undefined', () => {
    expect(blank(null)).toBe('');
    expect(blank(undefined)).toBe('');
    expect(blank('')).toBe('');
    expect(blank('null')).toBe('');
    expect(blank('undefined')).toBe('');
  });

  it('returns trimmed string for valid values', () => {
    expect(blank('  hello  ')).toBe('hello');
    expect(blank('test')).toBe('test');
  });
});

describe('normalizeCountry', () => {
  it('normalizes US variants', () => {
    expect(normalizeCountry('US')).toBe('United States');
    expect(normalizeCountry('USA')).toBe('United States');
    expect(normalizeCountry('United States')).toBe('United States');
  });

  it('normalizes UK variants', () => {
    expect(normalizeCountry('UK')).toBe('United Kingdom');
  });

  it('passes through unknown countries', () => {
    expect(normalizeCountry('India')).toBe('India');
  });
});

describe('categories', () => {
  it('All category matches everything', () => {
    expect(articleMatchesCategory({ title: 'test' }, 'All')).toBe(true);
  });

  it('getCategoryLabel returns correct labels', () => {
    expect(getCategoryLabel('Cancer_Oncology')).toBe('Cancer & Oncology');
    expect(getCategoryLabel('All')).toBe('All');
  });
});
