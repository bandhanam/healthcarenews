import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SymptomChartsSection } from './SymptomCharts';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="rc">{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  RadarChart: ({ children }) => <div>{children}</div>,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => null,
  Legend: () => null,
}));

describe('SymptomChartsSection', () => {
  it('renders chart section titles when data is provided', () => {
    render(
      <SymptomChartsSection
        confidenceData={[{ disease: 'Test', score: 80 }]}
        bodyData={[{ system: 'Cardio', fullName: 'Cardiovascular', score: 40 }]}
        pieData={[{ name: 'Test', value: 80 }]}
      />,
    );
    expect(screen.getByText('Condition confidence')).toBeInTheDocument();
    expect(screen.getByText('Body systems signal')).toBeInTheDocument();
    expect(screen.getByText('Confidence mix')).toBeInTheDocument();
  });

  it('renders nothing when all datasets empty', () => {
    const { container } = render(
      <SymptomChartsSection confidenceData={[]} bodyData={[]} pieData={[]} />,
    );
    expect(container.querySelector('.sa-charts-grid')).toBeInTheDocument();
    expect(container.querySelector('.sa-chart-panel')).toBeNull();
  });
});
