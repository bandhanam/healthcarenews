import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TrialMatchPage from './TrialMatchPage';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }) => <div {...pick(p)}>{children}</div>,
    form: ({ children, ...p }) => <form {...pick(p)}>{children}</form>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  CircleMarker: () => null,
  Popup: () => null,
  useMap: () => ({ fitBounds: vi.fn() }),
}));

vi.mock('leaflet', () => ({
  default: { latLngBounds: vi.fn(() => ({ isValid: () => false })) },
  latLngBounds: vi.fn(() => ({ isValid: () => false })),
}));

function pick(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (['className','style','id','role','onClick','onSubmit'].includes(k)) out[k] = v;
  }
  return out;
}

beforeEach(() => { vi.restoreAllMocks(); });

describe('TrialMatchPage', () => {
  it('renders the page title', () => {
    render(<TrialMatchPage />);
    expect(screen.getByText('Clinical Trial Matchmaker')).toBeInTheDocument();
  });

  it('renders the TrialFinder badge', () => {
    render(<TrialMatchPage />);
    expect(screen.getByText('TrialFinder')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    render(<TrialMatchPage />);
    expect(screen.getByPlaceholderText(/Enter a condition/)).toBeInTheDocument();
  });

  it('renders condition cards', () => {
    render(<TrialMatchPage />);
    expect(screen.getByText('Breast Cancer')).toBeInTheDocument();
    expect(screen.getByText('Diabetes Type 2')).toBeInTheDocument();
    expect(screen.getByText('Alzheimer Disease')).toBeInTheDocument();
  });

  it('triggers search on condition card click', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ studies: [], totalCount: 0 }) })));
    render(<TrialMatchPage />);
    fireEvent.click(screen.getByText('Breast Cancer'));
    expect(screen.getByDisplayValue('Breast Cancer')).toBeInTheDocument();
  });
});
