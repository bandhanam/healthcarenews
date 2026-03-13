import { useState, useCallback } from 'react';
import './DateRangeFilter.css';

const PRESETS = [
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 },
  { label: '60 Days', days: 60 },
  { label: '90 Days', days: 90 },
];

function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function DateRangeFilter({ startDate, endDate, onChange }) {
  const [activeDays, setActiveDays] = useState(null);

  const handlePreset = useCallback((days) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    setActiveDays(days);
    onChange(toYMD(start), toYMD(end));
  }, [onChange]);

  const handleStartChange = useCallback((e) => {
    setActiveDays(null);
    onChange(e.target.value, endDate);
  }, [endDate, onChange]);

  const handleEndChange = useCallback((e) => {
    setActiveDays(null);
    onChange(startDate, e.target.value);
  }, [startDate, onChange]);

  return (
    <div className="date-range-filter">
      <div className="drf-presets">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            type="button"
            className={`drf-preset-btn ${activeDays === p.days ? 'active' : ''}`}
            onClick={() => handlePreset(p.days)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="drf-inputs">
        <div className="drf-field">
          <label className="drf-label">From</label>
          <input
            type="date"
            className="drf-date-input"
            value={startDate}
            onChange={handleStartChange}
            max={endDate}
          />
        </div>
        <div className="drf-field">
          <label className="drf-label">To</label>
          <input
            type="date"
            className="drf-date-input"
            value={endDate}
            onChange={handleEndChange}
            min={startDate}
            max={toYMD(new Date())}
          />
        </div>
      </div>
    </div>
  );
}

export default DateRangeFilter;
