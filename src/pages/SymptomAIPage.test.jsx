import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SymptomAIPage from './SymptomAIPage';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }) => <div {...pick(p)}>{children}</div>,
    span: ({ children, ...p }) => <span {...pick(p)}>{children}</span>,
    form: ({ children, ...p }) => <form {...pick(p)}>{children}</form>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('../utils/diseasePredictor', () => ({
  predictDiseases: vi.fn(),
  isModelReady: vi.fn(() => false),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  RadarChart: ({ children }) => <div>{children}</div>,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
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

describe('SymptomAIPage', () => {
  it('renders the page title', () => {
    render(<SymptomAIPage />);
    expect(screen.getByText('Intelligent Symptom Analyzer')).toBeInTheDocument();
  });

  it('renders the SymptomAI badge', () => {
    render(<SymptomAIPage />);
    expect(screen.getByText('SymptomAI')).toBeInTheDocument();
  });

  it('renders the input field', () => {
    render(<SymptomAIPage />);
    expect(screen.getByPlaceholderText(/Describe your symptoms/)).toBeInTheDocument();
  });

  it('renders suggestion cards', () => {
    render(<SymptomAIPage />);
    expect(screen.getByText('Try these symptom combinations')).toBeInTheDocument();
  });

  it('renders initial AI greeting', () => {
    render(<SymptomAIPage />);
    expect(screen.getByText(/I'm SymptomAI/)).toBeInTheDocument();
  });
});
