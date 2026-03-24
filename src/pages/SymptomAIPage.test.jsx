import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SymptomAIPage from './SymptomAIPage';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }) => <div {...pick(p)}>{children}</div>,
    header: ({ children, ...p }) => <header {...pick(p)}>{children}</header>,
    span: ({ children, ...p }) => <span {...pick(p)}>{children}</span>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('../utils/diseasePredictor', () => ({
  predictDiseases: vi.fn(() => Promise.resolve([])),
  isModelReady: vi.fn(() => false),
  getRiskLevel: vi.fn(() => ({ level: 'Low', color: '#16a34a', icon: '🟢' })),
  getUrgencyRecommendation: vi.fn(() => null),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
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
    if (['className', 'style', 'id', 'role', 'onClick', 'onSubmit', 'disabled', 'children', 'initial', 'animate', 'exit', 'transition'].includes(k)) {
      out[k] = v;
    }
  }
  return out;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('SymptomAIPage', () => {
  it('renders the page title', () => {
    render(<SymptomAIPage />);
    expect(screen.getByText('Intelligent Symptom Analyzer')).toBeInTheDocument();
  });

  it('renders AI-Powered badge', () => {
    render(<SymptomAIPage />);
    expect(screen.getByText('AI-Powered')).toBeInTheDocument();
  });

  it('renders symptom filter and body-area tabs', () => {
    render(<SymptomAIPage />);
    expect(screen.getByPlaceholderText(/Filter symptoms in the list/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /General/i })).toBeInTheDocument();
  });

  it('shows hint about search vs tabs', () => {
    render(<SymptomAIPage />);
    expect(screen.getByText(/Tip:/)).toBeInTheDocument();
    expect(screen.getByText(/filters this list/i)).toBeInTheDocument();
  });
});
