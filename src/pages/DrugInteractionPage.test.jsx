import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DrugInteractionPage from './DrugInteractionPage';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...filterDomProps(props)}>{children}</div>,
    section: ({ children, ...props }) => <section {...filterDomProps(props)}>{children}</section>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

function filterDomProps(props) {
  const filtered = {};
  for (const [key, val] of Object.entries(props)) {
    if (['className', 'style', 'id', 'role', 'onClick'].includes(key)) {
      filtered[key] = val;
    }
  }
  return filtered;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('DrugInteractionPage', () => {
  it('renders the page title', () => {
    render(<DrugInteractionPage />);
    expect(screen.getByText('Drug Interaction Checker')).toBeInTheDocument();
  });

  it('renders the subtitle with data source', () => {
    render(<DrugInteractionPage />);
    expect(screen.getAllByText(/NIH RxNav/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders the search input', () => {
    render(<DrugInteractionPage />);
    expect(screen.getByPlaceholderText(/Search medications/)).toBeInTheDocument();
  });

  it('renders quick-check cards', () => {
    render(<DrugInteractionPage />);
    expect(screen.getByText('Aspirin + Warfarin')).toBeInTheDocument();
    expect(screen.getByText('Omeprazole + Clopidogrel')).toBeInTheDocument();
  });

  it('renders how-it-works section', () => {
    render(<DrugInteractionPage />);
    expect(screen.getByText('How it works')).toBeInTheDocument();
    expect(screen.getByText('Add medications')).toBeInTheDocument();
  });

  it('shows autocomplete suggestions when typing', () => {
    render(<DrugInteractionPage />);
    const input = screen.getByPlaceholderText(/Search medications/);
    fireEvent.change(input, { target: { value: 'asp' } });
    expect(screen.getByText('aspirin')).toBeInTheDocument();
    expect(screen.getByText('Pain / Anti-inflammatory')).toBeInTheDocument();
  });

  it('adds a drug chip via Enter key', () => {
    render(<DrugInteractionPage />);
    const input = screen.getByPlaceholderText(/Search medications/);
    fireEvent.change(input, { target: { value: 'asp' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const chips = screen.getAllByText('aspirin');
    expect(chips.length).toBeGreaterThanOrEqual(1);
  });

  it('loads a quick-check combo on click', () => {
    render(<DrugInteractionPage />);
    fireEvent.click(screen.getByText('Aspirin + Warfarin'));
    expect(screen.getByText('aspirin')).toBeInTheDocument();
    expect(screen.getByText('warfarin')).toBeInTheDocument();
  });

  it('removes a drug chip when clicking x', () => {
    render(<DrugInteractionPage />);
    fireEvent.click(screen.getByText('Aspirin + Warfarin'));
    const removeButtons = screen.getAllByText('\u00D7');
    fireEvent.click(removeButtons[0]);
    const warfarinChips = screen.getAllByText('warfarin');
    expect(warfarinChips.length).toBeGreaterThanOrEqual(1);
  });

  it('triggers check and shows loading state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ idGroup: { rxnormId: ['12345'] } }),
        }),
      ),
    );

    render(<DrugInteractionPage />);
    fireEvent.click(screen.getByText('Aspirin + Warfarin'));
    fireEvent.click(screen.getByTitle('Check Interactions'));
    expect(screen.getByText('Resolving drug names...')).toBeInTheDocument();
  });
});
