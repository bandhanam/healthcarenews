import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClinicalInsightPage from './ClinicalInsightPage';

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

describe('ClinicalInsightPage', () => {
  it('renders the page title', () => {
    render(<ClinicalInsightPage />);
    expect(screen.getByText('Trial Success Rate Analyzer')).toBeInTheDocument();
  });

  it('renders the ClinicalInsight badge', () => {
    render(<ClinicalInsightPage />);
    expect(screen.getByText('ClinicalInsight')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<ClinicalInsightPage />);
    expect(screen.getByPlaceholderText(/Enter condition/)).toBeInTheDocument();
  });

  it('renders condition buttons', () => {
    render(<ClinicalInsightPage />);
    expect(screen.getByText('Breast Cancer')).toBeInTheDocument();
    expect(screen.getByText('Diabetes Type 2')).toBeInTheDocument();
    expect(screen.getByText('COVID-19')).toBeInTheDocument();
  });

  it('sets query when clicking a condition', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ studies: [] }) })));
    render(<ClinicalInsightPage />);
    fireEvent.click(screen.getByText('Obesity'));
    expect(screen.getByDisplayValue('obesity')).toBeInTheDocument();
  });
});
