import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResearchRadarPage from './ResearchRadarPage';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }) => <div {...pick(p)}>{children}</div>,
    form: ({ children, ...p }) => <form {...pick(p)}>{children}</form>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  AreaChart: ({ children }) => <div>{children}</div>,
  Area: () => null,
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
    if (['className','style','id','role','onClick','onSubmit','disabled'].includes(k)) out[k] = v;
  }
  return out;
}

beforeEach(() => { vi.restoreAllMocks(); });

describe('ResearchRadarPage', () => {
  it('renders the page title', () => {
    render(<ResearchRadarPage />);
    expect(screen.getByText('Medical Research Trend Analyzer')).toBeInTheDocument();
  });

  it('renders the ResearchRadar badge', () => {
    render(<ResearchRadarPage />);
    expect(screen.getByText('ResearchRadar')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<ResearchRadarPage />);
    expect(screen.getByPlaceholderText(/Search medical research/)).toBeInTheDocument();
  });

  it('renders topic buttons', () => {
    render(<ResearchRadarPage />);
    expect(screen.getByText('Cancer Immunotherapy')).toBeInTheDocument();
    expect(screen.getByText('CRISPR Gene Editing')).toBeInTheDocument();
  });
});
