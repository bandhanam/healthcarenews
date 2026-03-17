import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import NewsDigestPage from './NewsDigestPage';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...filterDomProps(props)}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

function filterDomProps(props) {
  const filtered = {};
  for (const [key, val] of Object.entries(props)) {
    if (['className', 'style', 'id', 'role', 'onClick'].includes(key)) {
      filtered[key] = val;
    }
  }
  return filtered;
}

vi.mock('../context/ArticlesContext', () => ({
  useArticlesContext: () => ({
    articles: [
      {
        id: '1',
        title: 'New Cancer Treatment Shows Promise',
        excerpt: 'A new immunotherapy approach has demonstrated significant results in clinical trials.',
        date: '2026-03-15',
        source: 'Reuters Health',
        country: 'United States',
        tags: ['oncology', 'immunotherapy'],
        keywords: ['cancer', 'treatment'],
        drugs: ['pembrolizumab'],
        sentiment: 'positive',
      },
      {
        id: '2',
        title: 'Diabetes Drug Recall',
        excerpt: 'FDA issues recall for popular diabetes medication due to contamination concerns.',
        date: '2026-03-14',
        source: 'FDA News',
        country: 'United States',
        tags: ['diabetes', 'recall'],
        keywords: ['metformin', 'recall'],
        drugs: ['metformin'],
        sentiment: 'negative',
      },
      {
        id: '3',
        title: 'Cardiology Research Breakthrough',
        excerpt: 'Novel biomarker discovery could improve early detection of heart disease.',
        date: '2026-03-13',
        source: 'Nature Medicine',
        country: 'United Kingdom',
        tags: ['cardiology', 'biomarker'],
        keywords: ['heart disease', 'biomarker'],
        drugs: [],
        sentiment: 'positive',
      },
    ],
    loading: false,
    error: null,
  }),
}));

describe('NewsDigestPage', () => {
  it('renders the page title', () => {
    render(<NewsDigestPage />);
    expect(screen.getByText('PharmaNews AI Digest')).toBeInTheDocument();
  });

  it('renders the morning briefing section', () => {
    render(<NewsDigestPage />);
    expect(screen.getByText('Morning Briefing')).toBeInTheDocument();
  });

  it('renders article titles in the briefing', () => {
    render(<NewsDigestPage />);
    expect(screen.getAllByText('New Cancer Treatment Shows Promise').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Diabetes Drug Recall').length).toBeGreaterThanOrEqual(1);
  });

  it('renders topic distribution chart section', () => {
    render(<NewsDigestPage />);
    expect(screen.getByText('Topic Distribution')).toBeInTheDocument();
  });

  it('renders sentiment analysis section', () => {
    render(<NewsDigestPage />);
    expect(screen.getByText('Sentiment Analysis')).toBeInTheDocument();
  });

  it('renders trending keywords section', () => {
    render(<NewsDigestPage />);
    expect(screen.getByText('Trending Keywords')).toBeInTheDocument();
  });

  it('renders the by-topic section', () => {
    render(<NewsDigestPage />);
    expect(screen.getByText('By Topic')).toBeInTheDocument();
  });

  it('shows article count in subtitle', () => {
    render(<NewsDigestPage />);
    expect(screen.getByText(/3 healthcare articles/)).toBeInTheDocument();
  });

  it('renders rank numbers for briefing cards', () => {
    render(<NewsDigestPage />);
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });
});
