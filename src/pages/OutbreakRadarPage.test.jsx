import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import OutbreakRadarPage from './OutbreakRadarPage';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }) => <div {...pick(p)}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

vi.mock('../context/ArticlesContext', () => ({
  useArticlesContext: () => ({
    articles: [
      { title: 'COVID-19 cases surge in United States', description: 'Coronavirus outbreak escalates', source: { name: 'Reuters' }, publishedAt: new Date().toISOString() },
      { title: 'Malaria outbreak in Kenya', description: 'New malaria cases reported in Kenya', source: { name: 'BBC' }, publishedAt: new Date().toISOString() },
    ],
    loading: false,
  }),
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({ children }) => <div>{children}</div>,
  Popup: ({ children }) => <div>{children}</div>,
  useMap: () => ({ fitBounds: vi.fn() }),
}));

vi.mock('leaflet', () => ({
  default: { latLngBounds: () => ({ isValid: () => true }) },
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
  RadarChart: ({ children }) => <div>{children}</div>,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

function pick(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (['className','style','id','role','onClick','data-testid'].includes(k)) out[k] = v;
  }
  return out;
}

beforeEach(() => { vi.restoreAllMocks(); });

describe('OutbreakRadarPage', () => {
  it('renders the page title', () => {
    render(<OutbreakRadarPage />);
    expect(screen.getByText('Disease Outbreak Intelligence')).toBeInTheDocument();
  });

  it('renders the OutbreakRadar badge', () => {
    render(<OutbreakRadarPage />);
    expect(screen.getByText(/OutbreakRadar/)).toBeInTheDocument();
  });

  it('renders severity summary cards', () => {
    render(<OutbreakRadarPage />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Total Alerts')).toBeInTheDocument();
  });

  it('renders the alert filter buttons', () => {
    render(<OutbreakRadarPage />);
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('renders detected outbreak alerts', () => {
    render(<OutbreakRadarPage />);
    expect(screen.getAllByText(/COVID-19/).length).toBeGreaterThanOrEqual(1);
  });
});
