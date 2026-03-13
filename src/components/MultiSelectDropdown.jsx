import { useState, useRef, useEffect } from 'react';
import './MultiSelectDropdown.css';

function MultiSelectDropdown({ label, options, selectedValues, onChange, placeholder = 'Select...' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));

  const toggle = (val) => {
    onChange(selectedValues.includes(val) ? selectedValues.filter((v) => v !== val) : [...selectedValues, val]);
  };

  return (
    <div className="msd" ref={ref}>
      <label className="msd-label">{label}</label>
      <button className="msd-trigger" onClick={() => setOpen(!open)} type="button">
        <span className="msd-trigger-text">
          {selectedValues.length > 0 ? `${selectedValues.length} selected` : placeholder}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <>
          <div className="msd-backdrop" onClick={() => setOpen(false)} />
          <div className="msd-dropdown">
            <input
              className="msd-search"
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="msd-options">
              {filtered.length === 0 && <div className="msd-empty">No options found</div>}
              {filtered.map((opt) => (
                <label key={opt} className="msd-option">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(opt)}
                    onChange={() => toggle(opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            {selectedValues.length > 0 && (
              <button className="msd-clear" onClick={() => onChange([])} type="button">Clear all</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default MultiSelectDropdown;
