import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HealthScanPage from './HealthScanPage';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }) => <div {...pick(p)}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('recharts', () => ({
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

function pick(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (['className','style','id','role','onClick','onSubmit'].includes(k)) out[k] = v;
  }
  return out;
}

beforeEach(() => { vi.restoreAllMocks(); });

describe('HealthScanPage', () => {
  it('renders the page title', () => {
    render(<HealthScanPage />);
    expect(screen.getByText('Medical Report Analyzer')).toBeInTheDocument();
  });

  it('renders the HealthScan Pro badge', () => {
    render(<HealthScanPage />);
    expect(screen.getByText('HealthScan Pro')).toBeInTheDocument();
  });

  it('renders lab value inputs', () => {
    render(<HealthScanPage />);
    expect(screen.getByText('Hemoglobin')).toBeInTheDocument();
    expect(screen.getByText('Blood Glucose')).toBeInTheDocument();
    expect(screen.getByText('Total Cholesterol')).toBeInTheDocument();
  });

  it('shows analyze button with count', () => {
    render(<HealthScanPage />);
    expect(screen.getByText(/0 values entered/)).toBeInTheDocument();
  });
});
