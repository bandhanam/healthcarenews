import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HealthScanPage from './HealthScanPage';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }) => <div {...pick(p)}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('../utils/diseasePredictor', () => ({
  predictDiseases: vi.fn(() => Promise.resolve([])),
  isModelReady: vi.fn(() => false),
}));

vi.mock('../utils/textExtractor', () => ({
  extractText: vi.fn(() => Promise.resolve('sample text')),
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

  it('renders mode toggle buttons', () => {
    render(<HealthScanPage />);
    expect(screen.getByText('Enter Lab Values')).toBeInTheDocument();
    expect(screen.getByText('Upload Report')).toBeInTheDocument();
  });

  it('renders lab value inputs in manual mode', () => {
    render(<HealthScanPage />);
    expect(screen.getByText('Hemoglobin')).toBeInTheDocument();
    expect(screen.getByText('Blood Glucose')).toBeInTheDocument();
    expect(screen.getByText('Total Cholesterol')).toBeInTheDocument();
  });

  it('switches to upload mode', () => {
    render(<HealthScanPage />);
    fireEvent.click(screen.getByText('Upload Report'));
    expect(screen.getByText(/Upload a medical report/)).toBeInTheDocument();
  });

  it('shows analyze button with count', () => {
    render(<HealthScanPage />);
    expect(screen.getByText(/0 values entered/)).toBeInTheDocument();
  });
});
