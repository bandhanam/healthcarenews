import {
  useState, useCallback, useMemo, memo, useDeferredValue, useEffect, useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SymptomChartsSection } from '../components/SymptomCharts';
import { predictDiseases, isModelReady, getRiskLevel, getUrgencyRecommendation } from '../utils/diseasePredictor';
import { getDiseaseInfo, getMergedDiet } from '../data/diseaseKnowledge';
import './SymptomAIPage.css';

const SYMPTOM_CATEGORIES = {
  'General': {
    icon: '🏥',
    symptoms: [
      'Fever', 'Fatigue', 'Weakness', 'Weight loss', 'Weight gain',
      'Night sweats', 'Chills', 'Loss of appetite', 'Dehydration', 'Dizziness',
      'Fainting', 'Swelling', 'Pale skin', 'Excessive thirst', 'Frequent urination',
    ],
  },
  'Head & Brain': {
    icon: '🧠',
    symptoms: [
      'Headache', 'Migraine', 'Blurry vision', 'Memory loss', 'Confusion',
      'Sensitivity to light', 'Seizures', 'Tremors', 'Difficulty concentrating',
      'Neck stiffness', 'Vertigo',
    ],
  },
  'Heart & Chest': {
    icon: '❤️',
    symptoms: [
      'Chest pain', 'Shortness of breath', 'Rapid heartbeat', 'Irregular heartbeat',
      'High blood pressure', 'Swollen legs', 'Chest tightness',
      'Pain radiating to arm', 'Cold hands and feet',
    ],
  },
  'Stomach & Digestion': {
    icon: '🫁',
    symptoms: [
      'Acidity', 'Nausea', 'Vomiting', 'Stomach pain', 'Bloating',
      'Diarrhea', 'Constipation', 'Loss of appetite', 'Heartburn',
      'Blood in stool', 'Indigestion', 'Abdominal cramps',
    ],
  },
  'Respiratory': {
    icon: '🫁',
    symptoms: [
      'Cough', 'Persistent cough', 'Wheezing', 'Difficulty breathing',
      'Coughing blood', 'Sore throat', 'Runny nose', 'Nasal congestion',
      'Sneezing', 'Phlegm production',
    ],
  },
  'Bones & Joints': {
    icon: '🦴',
    symptoms: [
      'Joint pain', 'Back pain', 'Muscle pain', 'Morning stiffness',
      'Swollen joints', 'Bone pain', 'Muscle weakness', 'Cramps',
      'Limited mobility', 'Neck pain',
    ],
  },
  'Skin & Hair': {
    icon: '🧬',
    symptoms: [
      'Rash', 'Itching', 'Dry skin', 'Yellowing of skin', 'Bruising easily',
      'Hair loss', 'Acne', 'Skin darkening', 'Wounds not healing',
      'Excessive sweating',
    ],
  },
  'Mental Health': {
    icon: '💭',
    symptoms: [
      'Anxiety', 'Depression', 'Mood swings', 'Insomnia', 'Sleep disturbance',
      'Irritability', 'Stress', 'Panic attacks', 'Loss of interest',
      'Difficulty sleeping',
    ],
  },
  'Urinary & Kidney': {
    icon: '💧',
    symptoms: [
      'Painful urination', 'Frequent urination', 'Blood in urine',
      'Dark urine', 'Foamy urine', 'Lower back pain',
      'Urinary urgency', 'Incontinence',
    ],
  },
  'Eyes & Ears': {
    icon: '👁️',
    symptoms: [
      'Blurry vision', 'Eye pain', 'Red eyes', 'Watery eyes',
      'Ear pain', 'Ringing in ears', 'Hearing loss', 'Double vision',
    ],
  },
};

const BODY_SYSTEMS = {
  'Cardiovascular': ['heart disease', 'hypertension', 'stroke', 'high cholesterol'],
  'Endocrine': ['diabetes', 'thyroid disorder', 'PCOS'],
  'Respiratory': ['asthma', 'COPD', 'pneumonia', 'tuberculosis'],
  'Neurological': ['epilepsy', 'Parkinson disease', 'Alzheimer disease', 'stroke'],
  'Digestive': ['liver disease', 'hepatitis', 'jaundice'],
  'Musculoskeletal': ['arthritis', 'osteoporosis'],
  'Immune': ['lupus', 'HIV/AIDS'],
  'Renal': ['kidney disease', 'urinary tract infection'],
  'Hematological': ['anemia', 'sepsis'],
  'Infectious': ['malaria', 'dengue', 'meningitis', 'tuberculosis'],
};

const SymptomRow = memo(function SymptomRow({ symptom, checked, onToggle }) {
  return (
    <label className={`sa-symptom-item ${checked ? 'checked' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(symptom)}
        className="sa-checkbox"
      />
      <span className="sa-checkmark">
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="sa-symptom-text">{symptom}</span>
    </label>
  );
});

function AnalyzingOverlay({ open, progress }) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="sa-modal-backdrop" role="presentation">
      <div
        className="sa-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        aria-label="Analysis in progress"
      >
        <div className="sa-modal-spinner" />
        <h3 className="sa-modal-title">Analyzing your symptoms</h3>
        <p className="sa-modal-text">
          AI is matching your pattern to possible conditions. This may take a few seconds — the page stays responsive.
        </p>
        {progress !== null && (
          <div className="sa-modal-progress">
            <div className="sa-modal-progress-track">
              <div className="sa-modal-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span>{progress}%</span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function buildBodySystemData(predictions) {
  if (!predictions?.length) return [];
  return Object.entries(BODY_SYSTEMS).map(([system, diseases]) => {
    const maxScore = predictions.reduce((max, p) => {
      if (diseases.some(d => p.disease.toLowerCase().includes(d.toLowerCase()))) {
        return Math.max(max, p.score);
      }
      return max;
    }, 0);
    return { system: system.substring(0, 10), fullName: system, score: maxScore };
  }).filter(d => d.score > 0);
}

function SymptomAIPage() {
  const [selected, setSelected] = useState(new Set());
  const [customSymptom, setCustomSymptom] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const deferredSearch = useDeferredValue(searchFilter);
  const [predictions, setPredictions] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [modelProgress, setModelProgress] = useState(null);
  const [expandedDisease, setExpandedDisease] = useState(0);
  const [analysisTime, setAnalysisTime] = useState(0);
  const [activeCategory, setActiveCategory] = useState('General');
  const resultsRef = useRef(null);

  const toggleSymptom = useCallback((symptom) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(symptom)) next.delete(symptom);
      else next.add(symptom);
      return next;
    });
  }, []);

  const addCustomSymptom = useCallback(() => {
    const trimmed = customSymptom.trim();
    if (trimmed && !selected.has(trimmed)) {
      setSelected(prev => new Set(prev).add(trimmed));
      setCustomSymptom('');
    }
  }, [customSymptom, selected]);

  const clearAll = useCallback(() => {
    setSelected(new Set());
    setPredictions([]);
    setExpandedDisease(0);
    setAnalysisTime(0);
  }, []);

  const analyzeSymptoms = useCallback(async () => {
    if (selected.size === 0 || analyzing) return;
    setAnalyzing(true);
    setModelProgress(null);
    setPredictions([]);
    const startTime = Date.now();
    const symptomArr = [...selected];
    const listPreview = symptomArr.length > 25
      ? `${symptomArr.slice(0, 25).join(', ')}; plus ${symptomArr.length - 25} more`
      : symptomArr.join(', ');
    const symptomText = `Patient symptoms: ${listPreview}. Which medical conditions are most likely?`;

    try {
      await new Promise((resolve) => {
        requestAnimationFrame(() => setTimeout(resolve, 0));
      });
      const results = await predictDiseases(symptomText, (p) => setModelProgress(p), {
        minConfidence: 0,
        returnAll: true,
        symptomListMode: true,
      });
      setPredictions(results);
      setAnalysisTime(((Date.now() - startTime) / 1000).toFixed(1));
      if (results.length > 0) setExpandedDisease(0);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      setPredictions([]);
    } finally {
      setAnalyzing(false);
      setModelProgress(null);
    }
  }, [selected, analyzing]);

  const filteredCategories = useMemo(() => {
    if (!deferredSearch.trim()) return SYMPTOM_CATEGORIES;
    const lower = deferredSearch.toLowerCase();
    const result = {};
    for (const [cat, data] of Object.entries(SYMPTOM_CATEGORIES)) {
      const filtered = data.symptoms.filter((s) => s.toLowerCase().includes(lower));
      if (filtered.length > 0) result[cat] = { ...data, symptoms: filtered };
    }
    return result;
  }, [deferredSearch]);

  useEffect(() => {
    const keys = Object.keys(filteredCategories);
    if (keys.length > 0 && !keys.includes(activeCategory)) {
      setActiveCategory(keys[0]);
    }
  }, [filteredCategories, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(SYMPTOM_CATEGORIES).map((c) => [c, 0]));
    for (const s of selected) {
      for (const [cat, data] of Object.entries(SYMPTOM_CATEGORIES)) {
        if (data.symptoms.includes(s)) counts[cat] += 1;
      }
    }
    return counts;
  }, [selected]);

  const significantPredictions = useMemo(() => predictions.filter(p => p.score >= 50), [predictions]);
  const bodyData = useMemo(() => buildBodySystemData(predictions), [predictions]);
  const topPrediction = significantPredictions[0];
  const urgency = getUrgencyRecommendation(significantPredictions);
  const modelReady = isModelReady();

  const pieData = useMemo(() => {
    if (significantPredictions.length === 0) return [];
    return significantPredictions.slice(0, 5).map(p => ({ name: p.disease, value: p.score }));
  }, [significantPredictions]);

  return (
    <div className="sa-page">
      <motion.header className="sa-hero" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="sa-hero-badge">AI-Powered</div>
        <h1 className="sa-title">Intelligent Symptom Analyzer</h1>
        <p className="sa-subtitle">
          Pick symptoms from any body-area tab — your selections are saved as you switch tabs. Then run one analysis.
        </p>
      </motion.header>

      <AnalyzingOverlay open={analyzing} progress={modelProgress} />

      <div className="sa-layout">
        {/* LEFT: Symptom Selector */}
        <div className="sa-selector-panel">
          <div className="sa-selector-header">
            <h2 className="sa-panel-title">
              <span>📋</span> Select Your Symptoms
            </h2>
            <span className="sa-selected-count">{selected.size} selected</span>
          </div>

          <p className="sa-hint">
            <strong>Tip:</strong> The search box only <em>filters this list</em> — it is not a separate filter. Switch tabs to add symptoms from other areas.
          </p>

          <div className="sa-search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Filter symptoms in the list…"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="sa-search-input"
              aria-label="Filter symptoms in the list"
            />
            {searchFilter && (
              <button type="button" className="sa-search-clear" onClick={() => setSearchFilter('')}>×</button>
            )}
          </div>

          <div className="sa-category-tabs" role="tablist" aria-label="Body areas">
            {Object.entries(filteredCategories).map(([cat, data]) => {
              const n = categoryCounts[cat] || 0;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === cat}
                  className={`sa-cat-tab ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  <span className="sa-cat-icon">{data.icon}</span>
                  <span className="sa-cat-name">{cat}</span>
                  {n > 0 && <span className="sa-cat-count">{n}</span>}
                </button>
              );
            })}
          </div>

          <div className="sa-symptoms-grid">
            {filteredCategories[activeCategory] && (
              <div className="sa-symptoms-list">
                {filteredCategories[activeCategory].symptoms.map((symptom) => (
                  <SymptomRow
                    key={symptom}
                    symptom={symptom}
                    checked={selected.has(symptom)}
                    onToggle={toggleSymptom}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="sa-custom-symptom">
            <input
              type="text"
              placeholder="Add custom symptom..."
              value={customSymptom}
              onChange={(e) => setCustomSymptom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomSymptom()}
              className="sa-custom-input"
            />
            <button className="sa-custom-add" onClick={addCustomSymptom} disabled={!customSymptom.trim()}>
              + Add
            </button>
          </div>

          {selected.size > 0 && (
            <div className="sa-selected-tags">
              <div className="sa-tags-header">
                <span className="sa-tags-label">Selected ({selected.size})</span>
                <button className="sa-clear-all" onClick={clearAll}>Clear All</button>
              </div>
              <div className="sa-tags-wrap">
                {[...selected].map(s => (
                  <span key={s} className="sa-tag">
                    {s}
                    <button className="sa-tag-remove" onClick={() => toggleSymptom(s)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            className={`sa-analyze-btn ${selected.size > 0 ? 'active' : ''}`}
            onClick={analyzeSymptoms}
            disabled={selected.size === 0 || analyzing}
          >
            {analyzing ? (
              <>
                <div className="sa-btn-spin" />
                {modelProgress !== null ? `Loading AI... ${modelProgress}%` : 'Analyzing...'}
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                Analyze {selected.size} Symptom{selected.size !== 1 ? 's' : ''}
              </>
            )}
          </button>

          {!modelReady && (
            <p className="sa-model-hint">🧠 AI model loading in background...</p>
          )}
        </div>

        {/* RIGHT: Results Dashboard */}
        <div className="sa-results-panel" ref={resultsRef}>
          {predictions.length === 0 && !analyzing && (
            <div className="sa-empty-state">
              <div className="sa-empty-icon">🔬</div>
              <h3>Select Symptoms to Begin</h3>
              <p>Choose symptoms from any tab on the left (they stay selected when you switch tabs), then click <strong>Analyze</strong>.</p>
              <div className="sa-empty-steps">
                <div className="sa-empty-step">
                  <span className="sa-step-num">1</span>
                  <span>Select symptoms</span>
                </div>
                <div className="sa-empty-step">
                  <span className="sa-step-num">2</span>
                  <span>Click Analyze</span>
                </div>
                <div className="sa-empty-step">
                  <span className="sa-step-num">3</span>
                  <span>View results</span>
                </div>
              </div>
            </div>
          )}

          {!analyzing && predictions.length > 0 && (
            <motion.div className="sa-dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="sa-dash-header">
                <h2>Analysis Results</h2>
                <span className="sa-dash-time">⏱️ {analysisTime}s</span>
              </div>

              {urgency && (
                <div className="sa-urgency" style={{ '--u-color': urgency.color }}>
                  <span className="sa-urgency-icon">{urgency.icon}</span>
                  <span>{urgency.message}</span>
                </div>
              )}

              <div className="sa-stat-cards">
                <div className="sa-stat-card" style={{ '--sc': '#6366f1' }}>
                  <span className="sa-sc-icon">🎯</span>
                  <span className="sa-sc-value">{significantPredictions.length}</span>
                  <span className="sa-sc-label">Conditions ({'>'}50%)</span>
                </div>
                <div className="sa-stat-card" style={{ '--sc': '#dc2626' }}>
                  <span className="sa-sc-icon">🔴</span>
                  <span className="sa-sc-value">{predictions.filter(p => p.score >= 60).length}</span>
                  <span className="sa-sc-label">High Risk</span>
                </div>
                <div className="sa-stat-card" style={{ '--sc': '#06b6d4' }}>
                  <span className="sa-sc-icon">📋</span>
                  <span className="sa-sc-value">{selected.size}</span>
                  <span className="sa-sc-label">Symptoms</span>
                </div>
                <div className="sa-stat-card" style={{ '--sc': '#16a34a' }}>
                  <span className="sa-sc-icon">🧠</span>
                  <span className="sa-sc-value">{predictions.length}</span>
                  <span className="sa-sc-label">Analyzed</span>
                </div>
              </div>

              {significantPredictions.length > 0 ? (
                <div className="sa-predictions-section">
                  <h3 className="sa-section-title"><span>🔬</span> Detected Conditions ({'>'}50%)</h3>
                  {significantPredictions.map((p, i) => {
                    const risk = getRiskLevel(p.score);
                    const info = getDiseaseInfo(p.disease);
                    const diet = getMergedDiet(info);
                    const isOpen = expandedDisease === i;
                    return (
                      <motion.div
                        key={p.disease}
                        className={`sa-disease-card ${isOpen ? 'open' : ''}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        style={{ '--dc': risk.color }}
                      >
                        <div className="sa-dc-header" onClick={() => setExpandedDisease(isOpen ? -1 : i)}>
                          <div className="sa-dc-rank" style={{ background: risk.color }}>{i + 1}</div>
                          <div className="sa-dc-main">
                            <span className="sa-dc-name">{p.disease}</span>
                            <div className="sa-dc-bar">
                              <motion.div
                                className="sa-dc-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${p.score}%` }}
                                transition={{ delay: i * 0.08 + 0.2, duration: 0.5 }}
                                style={{ background: risk.color }}
                              />
                            </div>
                          </div>
                          <div className="sa-dc-score-wrap">
                            <span className="sa-dc-score" style={{ color: risk.color }}>{p.score}%</span>
                            <span className="sa-dc-risk" style={{ background: `${risk.color}15`, color: risk.color }}>{risk.level}</span>
                          </div>
                          <svg className={`sa-dc-chevron ${isOpen ? 'open' : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                        <AnimatePresence>
                          {isOpen && info && (
                            <motion.div
                              className="sa-dc-details"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                            >
                              <div className="sa-dc-grid">
                                <div className="sa-dc-section">
                                  <h5>🛡️ Precautions</h5>
                                  <ul>{info.precautions.slice(0, 4).map((item, j) => <li key={j}>{item}</li>)}</ul>
                                </div>
                                <div className="sa-dc-section sa-dc-diet-section">
                                  <h5>🥗 Diet (condition + general whole foods)</h5>
                                  <p className="sa-diet-note">Includes vegetables, grains, and everyday foods — not a prescription; ask your clinician for personal advice.</p>
                                  <div className="sa-dc-diet">
                                    <div>
                                      <span className="sa-diet-label good">✅ Favor / eat more</span>
                                      <ul>{diet.recommended.slice(0, 10).map((item, j) => <li key={j}>{item}</li>)}</ul>
                                    </div>
                                    <div>
                                      <span className="sa-diet-label bad">❌ Limit / avoid</span>
                                      <ul>{diet.avoid.slice(0, 8).map((item, j) => <li key={j}>{item}</li>)}</ul>
                                    </div>
                                  </div>
                                </div>
                                <div className="sa-dc-section full">
                                  <h5>💡 Key Facts</h5>
                                  <ul>{info.awareness.slice(0, 3).map((item, j) => <li key={j}>{item}</li>)}</ul>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="sa-no-significant">
                  <span className="sa-no-icon">✅</span>
                  <h3>No High-Confidence Conditions</h3>
                  <p>No conditions exceeded 50% confidence based on your symptoms. This is generally positive, but consult a doctor if symptoms persist.</p>
                </div>
              )}

              <SymptomChartsSection
                confidenceData={significantPredictions}
                bodyData={bodyData}
                pieData={pieData}
              />

              <div className="sa-disclaimer">
                <span>⚠️</span>
                <span>This is an AI-assisted analysis for informational purposes only. It is not a substitute for professional medical advice. Always consult a healthcare provider.</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SymptomAIPage;
