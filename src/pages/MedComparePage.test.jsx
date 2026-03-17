import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MedComparePage from './MedComparePage';

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

describe('MedComparePage', () => {
  it('renders the page title', () => {
    render(<MedComparePage />);
    expect(screen.getByText('Head-to-Head Drug Comparison')).toBeInTheDocument();
  });

  it('renders the MedCompare badge', () => {
    render(<MedComparePage />);
    expect(screen.getByText('MedCompare')).toBeInTheDocument();
  });

  it('renders Drug A and Drug B inputs', () => {
    render(<MedComparePage />);
    expect(screen.getByText('Drug A')).toBeInTheDocument();
    expect(screen.getByText('Drug B')).toBeInTheDocument();
  });

  it('renders VS badge', () => {
    render(<MedComparePage />);
    expect(screen.getByText('VS')).toBeInTheDocument();
  });

  it('renders popular pair buttons', () => {
    render(<MedComparePage />);
    expect(screen.getByText('Popular:')).toBeInTheDocument();
    expect(screen.getByText('Ibuprofen vs Acetaminophen')).toBeInTheDocument();
  });
});
