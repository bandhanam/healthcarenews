import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DrugInteractionPage from './DrugInteractionPage';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...filterDomProps(props)}>{children}</div>,
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
    expect(screen.getByText('Drug Interaction Network')).toBeInTheDocument();
  });

  it('renders the subtitle with data source', () => {
    render(<DrugInteractionPage />);
    expect(screen.getByText(/NIH RxNav/)).toBeInTheDocument();
  });

  it('renders the drug input field', () => {
    render(<DrugInteractionPage />);
    expect(screen.getByPlaceholderText(/Type a drug name/)).toBeInTheDocument();
  });

  it('renders the check interactions button', () => {
    render(<DrugInteractionPage />);
    expect(screen.getByText('Check Interactions')).toBeInTheDocument();
  });

  it('renders popular combo buttons', () => {
    render(<DrugInteractionPage />);
    expect(screen.getByText('Try:')).toBeInTheDocument();
    expect(screen.getByText('Aspirin + Warfarin')).toBeInTheDocument();
    expect(screen.getByText('Metformin + Lisinopril')).toBeInTheDocument();
  });

  it('shows autocomplete suggestions when typing', () => {
    render(<DrugInteractionPage />);
    const input = screen.getByPlaceholderText(/Type a drug name/);
    fireEvent.change(input, { target: { value: 'asp' } });
    expect(screen.getByText('aspirin')).toBeInTheDocument();
  });

  it('adds a drug chip when pressing Enter', () => {
    render(<DrugInteractionPage />);
    const input = screen.getByPlaceholderText(/Type a drug name/);
    fireEvent.change(input, { target: { value: 'aspirin' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('aspirin')).toBeInTheDocument();
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('loads popular combo when clicking a combo button', () => {
    render(<DrugInteractionPage />);
    fireEvent.click(screen.getByText('Aspirin + Warfarin'));
    expect(screen.getByText('aspirin')).toBeInTheDocument();
    expect(screen.getByText('warfarin')).toBeInTheDocument();
  });

  it('removes a drug chip when clicking the remove button', () => {
    render(<DrugInteractionPage />);
    fireEvent.click(screen.getByText('Aspirin + Warfarin'));
    const removeButtons = screen.getAllByText('\u00D7');
    fireEvent.click(removeButtons[0]);
    expect(screen.queryByText('Clear all')).toBeInTheDocument();
  });

  it('checks interactions and shows loading state', async () => {
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
    fireEvent.click(screen.getByText('Check Interactions'));
    expect(screen.getByText('Checking...')).toBeInTheDocument();
  });
});
