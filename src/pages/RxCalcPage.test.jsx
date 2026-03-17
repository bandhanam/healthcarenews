import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RxCalcPage from './RxCalcPage';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }) => <div {...pick(p)}>{children}</div>,
    button: ({ children, ...p }) => <button {...pick(p)}>{children}</button>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
}));

function pick(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (['className','style','id','role','onClick','disabled','type','value','onChange'].includes(k)) out[k] = v;
  }
  return out;
}

beforeEach(() => { vi.restoreAllMocks(); });

describe('RxCalcPage', () => {
  it('renders the page title', () => {
    render(<RxCalcPage />);
    expect(screen.getByText('Medical Calculator Suite')).toBeInTheDocument();
  });

  it('renders the RxCalc badge', () => {
    render(<RxCalcPage />);
    expect(screen.getByText('RxCalc')).toBeInTheDocument();
  });

  it('renders all calculator tabs', () => {
    render(<RxCalcPage />);
    expect(screen.getAllByText('BMI Calculator').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('BSA Calculator')).toBeInTheDocument();
    expect(screen.getByText('eGFR (Kidney)')).toBeInTheDocument();
    expect(screen.getByText('Ideal Body Weight')).toBeInTheDocument();
    expect(screen.getByText('Calorie Needs')).toBeInTheDocument();
    expect(screen.getByText('Weight-Based Dose')).toBeInTheDocument();
  });

  it('shows BMI calculator by default', () => {
    render(<RxCalcPage />);
    expect(screen.getByPlaceholderText('70')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('175')).toBeInTheDocument();
  });

  it('renders disclaimer', () => {
    render(<RxCalcPage />);
    expect(screen.getByText(/educational and reference purposes/)).toBeInTheDocument();
  });
});
