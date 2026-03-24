import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

const PALETTE = ['#06b6d4', '#0891b2', '#6366f1', '#8b5cf6', '#ec4899', '#f97316'];

function truncateLabel(name, max = 14) {
  if (!name || name.length <= max) return name;
  return `${name.slice(0, max)}…`;
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload || {};
  const val = payload[0].value;
  const title = row.shortName || row.disease || row.fullName || row.system || row.name || '—';
  return (
    <div className="sa-chart-tooltip">
      <strong>{title}</strong>
      <span>{typeof val === 'number' ? `${Math.round(val)}%` : val}</span>
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="sa-chart-tooltip">
      <strong>{p.name}</strong>
      <span>{p.value}% confidence</span>
    </div>
  );
}

export function SymptomChartsSection({ confidenceData, bodyData, pieData }) {
  const barData = confidenceData.slice(0, 6).map((p) => ({
    ...p,
    shortName: truncateLabel(p.disease, 16),
  }));

  const bodyBarData = bodyData
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((d) => ({
      ...d,
      shortName: truncateLabel(d.fullName || d.system, 18),
    }));

  const bodyChartHeight = Math.min(440, Math.max(220, bodyBarData.length * 34 + 48));

  return (
    <div className="sa-charts-grid">
      {barData.length > 0 && (
        <div className="sa-chart-panel sa-chart-panel--confidence">
          <div className="sa-chart-panel-head">
            <h4>Condition confidence</h4>
            <p className="sa-chart-panel-sub">Match strength by condition (higher = closer symptom fit)</p>
          </div>
          <div className="sa-chart-canvas">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ left: 4, right: 28, top: 8, bottom: 8 }}
                barCategoryGap={10}
              >
                <defs>
                  {barData.map((_, i) => (
                    <linearGradient key={i} id={`sa-bar-grad-${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={1} />
                      <stop offset="100%" stopColor={PALETTE[(i + 1) % PALETTE.length]} stopOpacity={0.45} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" horizontal vertical={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: 'var(--color-text-dim)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  unit="%"
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  width={108}
                  tick={{ fontSize: 11, fill: 'var(--color-text)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(6, 182, 212, 0.06)' }} />
                <Bar dataKey="score" radius={[0, 10, 10, 0]} maxBarSize={28}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={`url(#sa-bar-grad-${i})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {bodyBarData.length > 0 && (
        <div className="sa-chart-panel sa-chart-panel--body">
          <div className="sa-chart-panel-head">
            <h4>Body systems signal</h4>
            <p className="sa-chart-panel-sub">
              Each bar shows how strongly that body system aligns with your likely conditions (0–100%)
            </p>
          </div>
          <div className="sa-chart-canvas sa-chart-canvas--body">
            <ResponsiveContainer width="100%" height={bodyChartHeight}>
              <BarChart
                data={bodyBarData}
                layout="vertical"
                margin={{ left: 4, right: 28, top: 8, bottom: 8 }}
                barCategoryGap={8}
              >
                <defs>
                  {bodyBarData.map((_, i) => (
                    <linearGradient key={i} id={`sa-body-bar-${i}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={1} />
                      <stop offset="100%" stopColor={PALETTE[(i + 2) % PALETTE.length]} stopOpacity={0.45} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" horizontal vertical={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: 'var(--color-text-dim)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  unit="%"
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  width={118}
                  tick={{ fontSize: 11, fill: 'var(--color-text)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(6, 182, 212, 0.06)' }} />
                <Bar dataKey="score" radius={[0, 10, 10, 0]} maxBarSize={26}>
                  {bodyBarData.map((_, i) => (
                    <Cell key={i} fill={`url(#sa-body-bar-${i})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {pieData.length > 0 && (
        <div className="sa-chart-panel sa-chart-panel--donut">
          <div className="sa-chart-panel-head">
            <h4>Confidence mix</h4>
            <p className="sa-chart-panel-sub">Share of total modeled confidence across top conditions</p>
          </div>
          <div className="sa-chart-canvas sa-chart-canvas--donut">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <defs>
                  {pieData.map((_, i) => (
                    <linearGradient key={i} id={`sa-donut-${i}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={PALETTE[i % PALETTE.length]} />
                      <stop offset="100%" stopColor={PALETTE[(i + 2) % PALETTE.length]} stopOpacity={0.75} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="48%"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="var(--color-bg-card)"
                  strokeWidth={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={`url(#sa-donut-${i})`} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(value) => truncateLabel(value, 18)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
