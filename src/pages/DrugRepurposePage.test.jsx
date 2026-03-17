import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DrugRepurposePage from './DrugRepurposePage';

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
  ScatterChart: ({ children }) => <div>{children}</div>,
  Scatter: () => null,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
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
    if (['className', 'style', 'id', 'role', 'onClick', 'onSubmit', 'disabled'].includes(k)) out[k] = v;
  }
  return out;
}

beforeEach(() => { vi.restoreAllMocks(); });

describe('DrugRepurposePage', () => {
  it('renders the page title', () => {
    render(<DrugRepurposePage />);
    expect(screen.getByText('Drug Repurposing Explorer')).toBeInTheDocument();
  });

  it('renders the DrugRepurpose badge', () => {
    render(<DrugRepurposePage />);
    expect(screen.getByText('DrugRepurpose')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<DrugRepurposePage />);
    expect(screen.getByPlaceholderText(/Enter drug compound name/)).toBeInTheDocument();
  });

  it('renders quick-pick buttons', () => {
    render(<DrugRepurposePage />);
    expect(screen.getByText('Try:')).toBeInTheDocument();
    expect(screen.getByText('Aspirin')).toBeInTheDocument();
    expect(screen.getByText('Metformin')).toBeInTheDocument();
    expect(screen.getByText('Caffeine')).toBeInTheDocument();
  });

  it('sets query when clicking a quick-pick', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })));
    render(<DrugRepurposePage />);
    fireEvent.click(screen.getByText('Caffeine'));
    expect(screen.getByDisplayValue('caffeine')).toBeInTheDocument();
  });
});
