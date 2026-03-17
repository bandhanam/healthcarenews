import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BioSentinelPage from './BioSentinelPage';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }) => <div {...pick(p)}>{children}</div>,
    form: ({ children, ...p }) => <form {...pick(p)}>{children}</form>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
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
    if (['className','style','id','role','onClick','onSubmit','disabled'].includes(k)) out[k] = v;
  }
  return out;
}

beforeEach(() => { vi.restoreAllMocks(); });

describe('BioSentinelPage', () => {
  it('renders the page title', () => {
    render(<BioSentinelPage />);
    expect(screen.getByText('Pharma Intelligence Hub')).toBeInTheDocument();
  });

  it('renders the BioSentinel badge', () => {
    render(<BioSentinelPage />);
    expect(screen.getByText('BioSentinel')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<BioSentinelPage />);
    expect(screen.getByPlaceholderText(/Search pharma company/)).toBeInTheDocument();
  });

  it('renders company buttons', () => {
    render(<BioSentinelPage />);
    expect(screen.getByText('Pfizer')).toBeInTheDocument();
    expect(screen.getByText('Novartis')).toBeInTheDocument();
    expect(screen.getByText('AstraZeneca')).toBeInTheDocument();
  });

  it('sets query when clicking a company', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ studies: [], results: [] }) })));
    render(<BioSentinelPage />);
    fireEvent.click(screen.getByText('Merck'));
    expect(screen.getByDisplayValue('merck')).toBeInTheDocument();
  });
});
