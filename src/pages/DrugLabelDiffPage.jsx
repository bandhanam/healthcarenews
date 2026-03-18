import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './DrugLabelDiffPage.css';

const SECTIONS = [
  { key: 'indications_and_usage', label: 'Indications & Usage' },
  { key: 'warnings', label: 'Warnings' },
  { key: 'dosage_and_administration', label: 'Dosage & Administration' },
  { key: 'adverse_reactions', label: 'Adverse Reactions' },
  { key: 'drug_interactions', label: 'Drug Interactions' },
  { key: 'contraindications', label: 'Contraindications' },
];

const QUICK = ['aspirin', 'metformin', 'ibuprofen', 'atorvastatin', 'omeprazole', 'lisinopril', 'amlodipine', 'metoprolol'];

export default function DrugLabelDiffPage() {
  const [query, setQuery] = useState('');
  const [versions, setVersions] = useState([]);
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSection, setSelectedSection] = useState('indications_and_usage');

  const search = useCallback(async (override) => {
    const q = (override ?? query).trim();
    if (!q) return;
    if (override) setQuery(override);
    setLoading(true);
    setError(null);
    setVersions([]);
    setDiff(null);
    try {
      const r = await fetch(`/api/label/versions?q=${encodeURIComponent(q)}&limit=20`);
      const d = await r.json();
      setVersions(d.versions || []);
      if (d.versions?.length >= 2) {
        const appNum = d.versions[0].application_number;
        if (appNum) {
          const diffRes = await fetch(`/api/label/diff?application_number=${encodeURIComponent(appNum)}`);
          const diffData = await diffRes.json();
          setDiff(diffData);
        }
      }
    } catch (e) {
      setError(e.message || 'Failed to fetch label versions');
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <div className="dld-page">
      <div className="dld-hero">
        <span className="dld-hero-badge">openFDA</span>
        <h1 className="dld-title">Drug Label Diff</h1>
        <p className="dld-subtitle">Compare FDA drug label versions over time. See safety, indication, and dosage changes.</p>
      </div>

      <div className="dld-search-row">
        <input
          type="text"
          placeholder="Enter drug name (e.g., aspirin, metformin)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button type="button" onClick={search} disabled={loading || !query.trim()}>
          {loading ? 'Searching…' : 'Compare Versions'}
        </button>
      </div>

      <div className="dld-quick">
        <span>Try:</span>
        {QUICK.map((drug) => (
          <button key={drug} type="button" onClick={() => search(drug)}>
            {drug}
          </button>
        ))}
      </div>

      {error && (
        <motion.div className="dld-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {error}
        </motion.div>
      )}

      {versions.length > 0 && (
        <motion.div className="dld-results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2>Label Versions</h2>
          <div className="dld-versions-list">
            {versions.slice(0, 10).map((v) => (
              <div key={v.id} className="dld-version-item">
                <span className="dld-version-date">{v.effective_time}</span>
                <span className="dld-version-name">{v.brand_name || v.generic_name}</span>
                <span className="dld-version-app">NDA {v.application_number}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {diff && (
        <motion.div className="dld-diff-section" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2>Version Comparison</h2>
          <div className="dld-diff-header">
            <div className="dld-diff-old">
              <strong>Older</strong>
              <span>{diff.older?.effective_time}</span>
            </div>
            <div className="dld-diff-arrow">→</div>
            <div className="dld-diff-new">
              <strong>Newer</strong>
              <span>{diff.newer?.effective_time}</span>
            </div>
          </div>

          <div className="dld-section-tabs">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`dld-section-tab ${selectedSection === s.key ? 'active' : ''}`}
                onClick={() => setSelectedSection(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {SECTIONS.filter((s) => s.key === selectedSection).map((s) => {
              const d = diff.diffs?.[s.key];
              if (!d) return null;
              return (
                <motion.div
                  key={s.key}
                  className="dld-diff-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {d.unchanged ? (
                    <p className="dld-unchanged">No significant changes in this section.</p>
                  ) : (
                    <>
                      {d.removed?.length > 0 && (
                        <div className="dld-diff-block removed">
                          <h4>Removed</h4>
                          {d.removed.map((line, i) => (
                            <div key={i} className="dld-diff-line">− {line}</div>
                          ))}
                        </div>
                      )}
                      {d.added?.length > 0 && (
                        <div className="dld-diff-block added">
                          <h4>Added</h4>
                          {d.added.map((line, i) => (
                            <div key={i} className="dld-diff-line">+ {line}</div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {!loading && !versions.length && query && !error && (
        <p className="dld-empty">No label versions found for "{query}". Try a different drug name.</p>
      )}
    </div>
  );
}
