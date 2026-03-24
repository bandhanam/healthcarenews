import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import DrugTimelinePage from './DrugTimelinePage';

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

describe('DrugTimelinePage', () => {
  it('renders the page title', () => {
    render(<DrugTimelinePage />);
    expect(screen.getByText('Drug Lifecycle Visualizer')).toBeInTheDocument();
  });

  it('renders the DrugTimeline badge', () => {
    render(<DrugTimelinePage />);
    expect(screen.getByText('DrugTimeline')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<DrugTimelinePage />);
    expect(screen.getByPlaceholderText(/Enter drug name/)).toBeInTheDocument();
  });

  it('renders popular drug buttons', () => {
    render(<DrugTimelinePage />);
    expect(screen.getByText('Popular:')).toBeInTheDocument();
    expect(screen.getByText('Ozempic')).toBeInTheDocument();
    expect(screen.getByText('Keytruda')).toBeInTheDocument();
  });

  it('sets query when clicking a popular drug', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ studies: [], results: [] }) })));
    render(<DrugTimelinePage />);
    fireEvent.click(screen.getByText('Humira'));
    expect(screen.getByDisplayValue('adalimumab')).toBeInTheDocument();
  });

  it('shows autocomplete suggestions after typing 2 characters', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ studies: [], results: [] }),
        }),
      ),
    );
    render(<DrugTimelinePage />);
    const input = screen.getByPlaceholderText(/Enter drug name/);
    fireEvent.change(input, { target: { value: 'Pa' } });
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
    expect(within(screen.getByRole('listbox')).getByText('Paracetamol')).toBeInTheDocument();
  });
});
