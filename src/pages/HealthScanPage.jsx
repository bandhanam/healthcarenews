import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import './HealthScanPage.css';

const RANGES = {
  hemoglobin:    { label: 'Hemoglobin',       unit: 'g/dL',     low: 12, high: 17.5,  icon: '\uD83E\uDE78' },
  wbc:           { label: 'WBC',              unit: 'K/uL',     low: 4,  high: 11,    icon: '\uD83D\uDEE1\uFE0F' },
  rbc:           { label: 'RBC',              unit: 'M/uL',     low: 4.2,high: 5.9,   icon: '\uD83D\uDD34' },
  platelets:     { label: 'Platelets',        unit: 'K/uL',     low: 150,high: 400,   icon: '\uD83E\uDE78' },
  glucose:       { label: 'Blood Glucose',    unit: 'mg/dL',    low: 70, high: 100,   icon: '\uD83C\uDF6C' },
  hba1c:         { label: 'HbA1c',            unit: '%',        low: 4,  high: 5.7,   icon: '\uD83D\uDCC8' },
  cholesterol:   { label: 'Total Cholesterol', unit: 'mg/dL',   low: 0,  high: 200,   icon: '\u2764\uFE0F' },
  hdl:           { label: 'HDL Cholesterol',  unit: 'mg/dL',    low: 40, high: 200,   icon: '\uD83D\uDC9A' },
  ldl:           { label: 'LDL Cholesterol',  unit: 'mg/dL',    low: 0,  high: 100,   icon: '\uD83D\uDC9B' },
  triglycerides: { label: 'Triglycerides',    unit: 'mg/dL',    low: 0,  high: 150,   icon: '\uD83E\uDDC8' },
  creatinine:    { label: 'Creatinine',       unit: 'mg/dL',    low: 0.6,high: 1.2,   icon: '\uD83E\uDEC0' },
  alt:           { label: 'ALT (SGPT)',       unit: 'U/L',      low: 7,  high: 56,    icon: '\uD83E\uDEB3' },
  ast:           { label: 'AST (SGOT)',       unit: 'U/L',      low: 10, high: 40,    icon: '\uD83E\uDEB3' },
  tsh:           { label: 'TSH',              unit: 'mIU/L',    low: 0.4,high: 4,     icon: '\uD83E\uDD8B' },
  vitd:          { label: 'Vitamin D',        unit: 'ng/mL',    low: 30, high: 100,   icon: '\u2600\uFE0F' },
  iron:          { label: 'Iron',             unit: 'ug/dL',    low: 60, high: 170,   icon: '\uD83E\uDDF2' },
  bp_systolic:   { label: 'BP Systolic',      unit: 'mmHg',     low: 90, high: 120,   icon: '\uD83D\uDC93' },
  bp_diastolic:  { label: 'BP Diastolic',     unit: 'mmHg',     low: 60, high: 80,    icon: '\uD83D\uDC93' },
  bmi:           { label: 'BMI',              unit: 'kg/m\u00B2', low: 18.5, high: 25, icon: '\u2696\uFE0F' },
};

function getStatus(key, val) {
  const ref = RANGES[key];
  if (!ref) return 'normal';
  if (val < ref.low) return 'low';
  if (val > ref.high) return 'high';
  return 'normal';
}

function calcScore(values) {
  const entries = Object.entries(values).filter(([k, v]) => RANGES[k] && v !== '');
  if (entries.length === 0) return null;
  let normalCount = 0;
  entries.forEach(([k, v]) => { if (getStatus(k, parseFloat(v)) === 'normal') normalCount++; });
  return Math.round((normalCount / entries.length) * 100);
}

function ScoreRing({ score }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const data = [{ value: score }, { value: 100 - score }];
  return (
    <div className="hs-score-ring">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={70} startAngle={90} endAngle={-270} paddingAngle={2}>
            <Cell fill={color} />
            <Cell fill="var(--color-border, #e2e8f0)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="hs-score-center">
        <span className="hs-score-num" style={{ color }}>{score}</span>
        <span className="hs-score-lbl">Health Score</span>
      </div>
    </div>
  );
}

function ValueBar({ keyName, value }) {
  const ref = RANGES[keyName];
  if (!ref) return null;
  const val = parseFloat(value);
  if (isNaN(val)) return null;
  const status = getStatus(keyName, val);
  const maxRange = ref.high * 1.5;
  const pct = Math.min((val / maxRange) * 100, 100);
  const lowPct = (ref.low / maxRange) * 100;
  const highPct = (ref.high / maxRange) * 100;
  const statusColor = status === 'normal' ? '#10b981' : status === 'high' ? '#ef4444' : '#f59e0b';

  return (
    <motion.div className={`hs-val-card hs-val-${status}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
      <div className="hs-val-top">
        <span className="hs-val-icon">{ref.icon}</span>
        <div className="hs-val-info">
          <span className="hs-val-label">{ref.label}</span>
          <span className="hs-val-reading"><strong>{val}</strong> {ref.unit}</span>
        </div>
        <span className={`hs-val-status hs-st-${status}`}>{status === 'normal' ? 'Normal' : status === 'high' ? 'High' : 'Low'}</span>
      </div>
      <div className="hs-val-bar-wrap">
        <div className="hs-val-bar-bg">
          <div className="hs-val-bar-normal" style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }} />
          <div className="hs-val-bar-marker" style={{ left: `${pct}%`, background: statusColor }} />
        </div>
        <div className="hs-val-bar-labels">
          <span>{ref.low} {ref.unit}</span>
          <span>{ref.high} {ref.unit}</span>
        </div>
      </div>
    </motion.div>
  );
}

function HealthScanPage() {
  const [values, setValues] = useState({});
  const [error, setError] = useState('');
  const [analyzed, setAnalyzed] = useState(false);

  const handleValueChange = useCallback((key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setAnalyzed(false);
  }, []);

  const analyze = useCallback(() => {
    const filled = Object.entries(values).filter(([k, v]) => RANGES[k] && v !== '' && !isNaN(parseFloat(v)));
    if (filled.length < 3) {
      setError('Please fill in at least 3 values to get a health score.');
      return;
    }
    setError('');
    setAnalyzed(true);
  }, [values]);

  const score = useMemo(() => analyzed ? calcScore(values) : null, [values, analyzed]);

  const abnormals = useMemo(() => {
    return Object.entries(values)
      .filter(([k, v]) => RANGES[k] && v !== '' && !isNaN(parseFloat(v)) && getStatus(k, parseFloat(v)) !== 'normal')
      .map(([k, v]) => ({ key: k, value: v, status: getStatus(k, parseFloat(v)), ...RANGES[k] }));
  }, [values]);

  const filledEntries = Object.entries(values).filter(([k, v]) => RANGES[k] && v !== '' && !isNaN(parseFloat(v)));

  return (
    <div className="hs-page">
      <motion.div className="hs-hero" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="hs-hero-badge">HealthScan Pro</div>
        <h1 className="hs-title">Medical Report Analyzer</h1>
        <p className="hs-subtitle">Enter your lab values for instant health scoring and detailed analysis.</p>
      </motion.div>

      <div className="hs-input-section">
        <div className="hs-panel-label">Enter Your Lab Results</div>
        <div className="hs-inputs-grid">
          {Object.entries(RANGES).map(([key, ref]) => (
            <div key={key} className="hs-input-item">
              <label className="hs-input-label">
                <span className="hs-input-icon">{ref.icon}</span>
                {ref.label}
                <span className="hs-input-unit">({ref.unit})</span>
              </label>
              <input
                type="number"
                step="any"
                className="hs-input"
                placeholder={`${ref.low} - ${ref.high}`}
                value={values[key] || ''}
                onChange={(e) => handleValueChange(key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <button className="hs-analyze-btn" onClick={analyze} disabled={filledEntries.length < 3}>
          Analyze My Results ({filledEntries.length} values entered)
        </button>
      </div>

      {error && <div className="hs-error">{error}</div>}

      <AnimatePresence>
        {analyzed && score !== null && (
          <motion.div className="hs-results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="hs-score-section">
              <ScoreRing score={score} />
              <div className="hs-score-detail">
                <h3>{score >= 80 ? 'Looking Great!' : score >= 60 ? 'Needs Attention' : 'Consult Your Doctor'}</h3>
                <p>{filledEntries.length - abnormals.length} of {filledEntries.length} values are in normal range.</p>
                {abnormals.length > 0 && (
                  <div className="hs-abnormal-list">
                    <span className="hs-abn-title">Flagged Values:</span>
                    {abnormals.map((a) => (
                      <span key={a.key} className={`hs-abn-chip hs-abn-${a.status}`}>
                        {a.label}: {a.value} {a.unit} ({a.status})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="hs-panel-label">Detailed Analysis</div>
            <div className="hs-vals-list">
              {filledEntries.map(([k, v]) => <ValueBar key={k} keyName={k} value={v} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HealthScanPage;
