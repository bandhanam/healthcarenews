import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: () => <div data-testid="bar-chart" />,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  PieChart: () => <div data-testid="pie-chart" />,
  Pie: () => null,
  Cell: () => null,
  Legend: () => null,
  AreaChart: () => <div data-testid="area-chart" />,
  Area: () => null,
}));

global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({
      success: true,
      data: {
        summary: {
          totalProviders: 7500000,
          individuals: 5000000,
          organizations: 2500000,
        },
        byEntityType: [
          { name: 'Individual', value: 5000000 },
          { name: 'Organization', value: 2500000 },
        ],
        byState: [
          { state: 'CA', count: 500000 },
          { state: 'TX', count: 400000 },
        ],
        byCredential: [
          { credential: 'MD', count: 1000000 },
          { credential: 'DO', count: 500000 },
        ],
        byCity: [],
        bySpecialty: [],
        mapData: { CA: 500000, TX: 400000 },
        recentActivity: [],
      },
    }),
  })
);

import ProviderDirectoryPage from './ProviderDirectoryPage';

describe('ProviderDirectoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Advanced Provider Dashboard heading', async () => {
    render(
      <BrowserRouter>
        <ProviderDirectoryPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Advanced Provider Dashboard')).toBeInTheDocument();
  });

  it('renders search tab by default', () => {
    render(
      <BrowserRouter>
        <ProviderDirectoryPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Search Providers')).toBeInTheDocument();
  });

  it('renders analytics tab button', () => {
    render(
      <BrowserRouter>
        <ProviderDirectoryPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(
      <BrowserRouter>
        <ProviderDirectoryPage />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
  });
});
