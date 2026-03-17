import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DrugComparePage from './DrugComparePage';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }) => <div {...pick(p)}>{children}</div>,
    form: ({ children, ...p }) => <form {...pick(p)}>{children}</form>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

function pick(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (['className','style','id','role','onClick','onSubmit'].includes(k)) out[k] = v;
  }
  return out;
}

beforeEach(() => { vi.restoreAllMocks(); });

describe('DrugComparePage', () => {
  it('renders the page title', () => {
    render(<DrugComparePage />);
    expect(screen.getByText('Drug Compare & Explore')).toBeInTheDocument();
  });

  it('renders the PriceRx badge', () => {
    render(<DrugComparePage />);
    expect(screen.getByText('PriceRx')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<DrugComparePage />);
    expect(screen.getByPlaceholderText(/Search a drug/)).toBeInTheDocument();
  });

  it('renders popular drug buttons', () => {
    render(<DrugComparePage />);
    expect(screen.getByText('Popular:')).toBeInTheDocument();
    expect(screen.getByText('Metformin')).toBeInTheDocument();
    expect(screen.getByText('Atorvastatin')).toBeInTheDocument();
  });

  it('triggers search on popular click', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [], total: 0 }) })));
    render(<DrugComparePage />);
    fireEvent.click(screen.getByText('Omeprazole'));
    expect(screen.getByDisplayValue('omeprazole')).toBeInTheDocument();
  });
});
