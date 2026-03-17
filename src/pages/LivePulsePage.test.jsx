import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LivePulsePage from './LivePulsePage';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }) => <div {...pick(p)}>{children}</div>,
    span: ({ children, ...p }) => <span {...pick(p)}>{children}</span>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('../context/ArticlesContext', () => ({
  useArticlesContext: () => ({
    articles: [
      { title: 'Cancer breakthrough found', description: 'New treatment for cancer shows promise', source: { name: 'Reuters' }, publishedAt: new Date().toISOString() },
      { title: 'Heart disease study results', description: 'Cardiovascular research advances', source: { name: 'BBC' }, publishedAt: new Date().toISOString() },
    ],
    loading: false,
  }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  AreaChart: ({ children }) => <div>{children}</div>,
  Area: () => null,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  RadarChart: ({ children }) => <div>{children}</div>,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

function pick(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (['className','style','id','role','onClick'].includes(k)) out[k] = v;
  }
  return out;
}

beforeEach(() => { vi.restoreAllMocks(); });

describe('LivePulsePage', () => {
  it('renders the page title', () => {
    render(<LivePulsePage />);
    expect(screen.getByText('Real-Time Health Dashboard')).toBeInTheDocument();
  });

  it('renders the LivePulse badge', () => {
    render(<LivePulsePage />);
    expect(screen.getByText(/LivePulse/)).toBeInTheDocument();
  });

  it('renders article volume section', () => {
    render(<LivePulsePage />);
    expect(screen.getByText('Article Volume (Last 14 Days)')).toBeInTheDocument();
  });

  it('renders topic distribution chart', () => {
    render(<LivePulsePage />);
    expect(screen.getByText('Topic Distribution')).toBeInTheDocument();
  });

  it('renders the live ticker badge', () => {
    render(<LivePulsePage />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });
});
