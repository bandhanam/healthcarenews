import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PharmaGlobePage from './PharmaGlobePage';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }) => <div {...pick(p)}>{children}</div>,
    button: ({ children, ...p }) => <button {...pick(p)}>{children}</button>,
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
  Treemap: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

function pick(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (['className','style','id','role','onClick','disabled'].includes(k)) out[k] = v;
  }
  return out;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [], studies: [] }) })));
});

describe('PharmaGlobePage', () => {
  it('renders the page title', () => {
    render(<PharmaGlobePage />);
    expect(screen.getByText('Global Pharma Intelligence Map')).toBeInTheDocument();
  });

  it('renders the PharmaGlobe badge', () => {
    render(<PharmaGlobePage />);
    expect(screen.getByText('PharmaGlobe')).toBeInTheDocument();
  });

  it('renders stat cards', () => {
    render(<PharmaGlobePage />);
    expect(screen.getByText('Countries')).toBeInTheDocument();
    expect(screen.getByText('Approvals')).toBeInTheDocument();
  });
});
