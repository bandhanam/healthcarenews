import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DrugIntelPage from './DrugIntelPage';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  CircleMarker: () => null,
  Popup: () => null,
  useMap: () => ({ fitBounds: vi.fn() }),
}));

vi.mock('leaflet', () => ({
  default: { latLngBounds: vi.fn(() => ({ extend: vi.fn() })) },
  latLngBounds: vi.fn(() => ({ extend: vi.fn() })),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...filterDomProps(props)}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

function filterDomProps(props) {
  const filtered = {};
  for (const [key, val] of Object.entries(props)) {
    if (['className', 'style', 'id', 'role', 'onClick', 'onSubmit'].includes(key)) {
      filtered[key] = val;
    }
  }
  return filtered;
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ studies: [], results: [], total: 0, totalCount: 0, competitors: [] }),
      }),
    ),
  );
});

describe('DrugIntelPage', () => {
  it('renders the page title', () => {
    render(<DrugIntelPage />);
    expect(screen.getByText('Drug Intelligence Dashboard')).toBeInTheDocument();
  });

  it('renders all three tab buttons', () => {
    render(<DrugIntelPage />);
    expect(screen.getByText('TrialMap')).toBeInTheDocument();
    expect(screen.getByText('ApprovalTracker')).toBeInTheDocument();
    expect(screen.getByText('CompetitorRadar')).toBeInTheDocument();
  });

  it('renders the specialty dropdown', () => {
    render(<DrugIntelPage />);
    expect(screen.getByDisplayValue('All Specialties')).toBeInTheDocument();
  });

  it('renders the search input with placeholder', () => {
    render(<DrugIntelPage />);
    expect(
      screen.getByPlaceholderText(/Search condition or drug/),
    ).toBeInTheDocument();
  });

  it('renders the map container', () => {
    render(<DrugIntelPage />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('renders quick-search condition chips', () => {
    render(<DrugIntelPage />);
    expect(screen.getByText('Quick search:')).toBeInTheDocument();
    expect(screen.getByText('Allergology')).toBeInTheDocument();
  });

  it('switches to CompetitorRadar tab', async () => {
    render(<DrugIntelPage />);
    fireEvent.click(screen.getByText('CompetitorRadar'));
    await waitFor(() => {
      expect(screen.getByText('Competitive Landscape Analysis')).toBeInTheDocument();
    });
    expect(
      screen.getByPlaceholderText(/Enter disease or therapeutic area/),
    ).toBeInTheDocument();
  });

  it('renders popular condition chips in CompetitorRadar', async () => {
    render(<DrugIntelPage />);
    fireEvent.click(screen.getByText('CompetitorRadar'));
    await waitFor(() => {
      expect(screen.getByText('Popular:')).toBeInTheDocument();
    });
  });
});
