import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChemExplorerPage from './ChemExplorerPage';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }) => <div {...pick(p)}>{children}</div>,
    form: ({ children, ...p }) => <form {...pick(p)}>{children}</form>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  RadarChart: ({ children }) => <div>{children}</div>,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Legend: () => null,
}));

function pick(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (['className', 'style', 'id', 'role', 'onClick', 'disabled', 'type', 'value', 'onChange', 'onSubmit'].includes(k)) out[k] = v;
  }
  return out;
}

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ total: 0, results: [] }),
  });
});

describe('ChemExplorerPage', () => {
  it('renders the page title', () => {
    render(<ChemExplorerPage />);
    expect(screen.getByText('ChemExplorer')).toBeInTheDocument();
  });

  it('renders the hero badge', () => {
    render(<ChemExplorerPage />);
    expect(screen.getByText('Drug Compound Explorer')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<ChemExplorerPage />);
    expect(screen.getByPlaceholderText(/Search a drug compound/)).toBeInTheDocument();
  });

  it('renders all quick-pick buttons', () => {
    render(<ChemExplorerPage />);
    const picks = ['aspirin', 'metformin', 'caffeine', 'ibuprofen', 'atorvastatin',
      'semaglutide', 'penicillin', 'sildenafil', 'paclitaxel', 'tamoxifen'];
    picks.forEach((drug) => {
      expect(screen.getByText(drug)).toBeInTheDocument();
    });
  });

  it('renders the Browse Database section', () => {
    render(<ChemExplorerPage />);
    expect(screen.getByText('Browse Database')).toBeInTheDocument();
  });

  it('renders the search button', () => {
    render(<ChemExplorerPage />);
    expect(screen.getByText('Search')).toBeInTheDocument();
  });
});
