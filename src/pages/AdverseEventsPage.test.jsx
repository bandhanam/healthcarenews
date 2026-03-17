import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdverseEventsPage from './AdverseEventsPage';

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

describe('AdverseEventsPage', () => {
  it('renders the page title', () => {
    render(<AdverseEventsPage />);
    expect(screen.getByText('Adverse Event Monitor')).toBeInTheDocument();
  });

  it('renders the SafetyWatch badge', () => {
    render(<AdverseEventsPage />);
    expect(screen.getByText('SafetyWatch')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<AdverseEventsPage />);
    expect(screen.getByPlaceholderText(/Search a drug/)).toBeInTheDocument();
  });

  it('renders popular drug buttons', () => {
    render(<AdverseEventsPage />);
    expect(screen.getByText('Popular:')).toBeInTheDocument();
    expect(screen.getByText('Ozempic')).toBeInTheDocument();
    expect(screen.getByText('Warfarin')).toBeInTheDocument();
  });

  it('sets query when clicking a popular drug', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [], meta: {} }) })));
    render(<AdverseEventsPage />);
    fireEvent.click(screen.getByText('Metformin'));
    expect(screen.getByDisplayValue('metformin')).toBeInTheDocument();
  });
});
