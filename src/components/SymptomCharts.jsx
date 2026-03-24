import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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

      {bodyData.length > 0 && (
        <div className="sa-chart-panel sa-chart-panel--radar">
          <div className="sa-chart-panel-head">
            <h4>Body systems signal</h4>
            <p className="sa-chart-panel-sub">Relative overlap with common disease categories</p>
          </div>
          <div className="sa-chart-canvas sa-chart-canvas--radar">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={bodyData} margin={{ top: 16, right: 36, bottom: 16, left: 36 }}>
                <defs>
                  <radialGradient id="sa-radar-fill" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.55} />
                    <stop offset="70%" stopColor="#0891b2" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.05} />
                  </radialGradient>
                  <linearGradient id="sa-radar-stroke" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <PolarGrid stroke="var(--color-border)" strokeDasharray="4 4" />
                <PolarAngleAxis
                  dataKey="system"
                  tick={{ fontSize: 10, fill: 'var(--color-text)', fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: 'var(--color-text-dim)' }}
                  tickCount={5}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="url(#sa-radar-stroke)"
                  strokeWidth={2.5}
                  fill="url(#sa-radar-fill)"
                  fillOpacity={1}
                  dot={{ r: 4, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Tooltip content={<ChartTooltip />} />
              </RadarChart>
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
