import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { extractText, isSupportedFile } from '../utils/textExtractor';
import { predictDiseases, isModelReady, getRiskLevel, getUrgencyRecommendation } from '../utils/diseasePredictor';
import { getDiseaseInfo } from '../data/diseaseKnowledge';
import './MedPredictPage.css';

const ACCEPT = '.jpg,.jpeg,.png,.gif,.bmp,.webp,.heic,.heif,.pdf,image/*,application/pdf';

const STEPS = [
  { key: 'idle', label: 'Upload', icon: '📤' },
  { key: 'extracting', label: 'Extract', icon: '📄' },
  { key: 'loading-model', label: 'AI Load', icon: '🧠' },
  { key: 'predicting', label: 'Analyze', icon: '🔬' },
  { key: 'done', label: 'Results', icon: '✅' },
];

function StepIndicator({ currentStep }) {
  const idx = STEPS.findIndex((s) => s.key === currentStep);
  return (
    <div className="mp-steps">
      {STEPS.map((step, i) => (
        <div key={step.key} className={`mp-step ${i < idx ? 'completed' : ''} ${i === idx ? 'active' : ''}`}>
          <div className="mp-step-dot">
            {i < idx ? '✓' : <span>{step.icon}</span>}
          </div>
          <span className="mp-step-label">{step.label}</span>
          {i < STEPS.length - 1 && <div className={`mp-step-line ${i < idx ? 'filled' : ''}`} />}
        </div>
      ))}
    </div>
  );
}

function RiskGauge({ score, disease }) {
  const risk = getRiskLevel(score);
  const rotation = (score / 100) * 180 - 90;
  
  return (
    <div className="mp-gauge">
      <svg viewBox="0 0 200 120" className="mp-gauge-svg">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="50%" stopColor="#ca8a04" />
            <stop offset="75%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round" 
          strokeDasharray={`${(score / 100) * 251.2} 251.2`} />
        <g transform={`rotate(${rotation}, 100, 100)`}>
          <polygon points="100,30 95,100 105,100" fill={risk.color} />
          <circle cx="100" cy="100" r="8" fill={risk.color} />
        </g>
      </svg>
      <div className="mp-gauge-info">
        <span className="mp-gauge-score" style={{ color: risk.color }}>{score}%</span>
        <span className="mp-gauge-label">{disease}</span>
        <span className="mp-gauge-risk" style={{ background: `${risk.color}20`, color: risk.color }}>
          {risk.icon} {risk.level} Risk
        </span>
      </div>
    </div>
  );
}

function PredictionCard({ prediction, rank, isExpanded, onToggle }) {
  const risk = getRiskLevel(prediction.score);
  const info = getDiseaseInfo(prediction.disease);
  
  return (
    <motion.div
      className={`mp-pred-card ${isExpanded ? 'expanded' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
      style={{ '--risk-color': risk.color }}
    >
      <div className="mp-pred-header" onClick={onToggle}>
        <div className="mp-pred-rank" style={{ background: risk.color }}>{rank + 1}</div>
        <div className="mp-pred-main">
          <h4 className="mp-pred-name">{prediction.disease}</h4>
          <div className="mp-pred-bar">
            <motion.div 
              className="mp-pred-fill" 
              initial={{ width: 0 }}
              animate={{ width: `${prediction.score}%` }}
              transition={{ delay: rank * 0.1 + 0.2, duration: 0.6 }}
              style={{ background: risk.color }}
            />
          </div>
        </div>
        <div className="mp-pred-score-box">
          <span className="mp-pred-score" style={{ color: risk.color }}>{prediction.score}%</span>
          <span className="mp-pred-risk-tag" style={{ background: `${risk.color}15`, color: risk.color }}>
            {risk.level}
          </span>
        </div>
        <button className="mp-pred-expand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points={isExpanded ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
          </svg>
        </button>
      </div>
      
      <AnimatePresence>
        {isExpanded && info && (
          <motion.div
            className="mp-pred-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mp-detail-grid">
              <div className="mp-detail-section">
                <h5><span className="mp-detail-icon">🛡️</span> Precautions</h5>
                <ul>
                  {info.precautions.slice(0, 4).map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
              <div className="mp-detail-section">
                <h5><span className="mp-detail-icon">🥗</span> Diet Recommendations</h5>
                <div className="mp-diet-cols">
                  <div className="mp-diet-good">
                    <span className="mp-diet-label">✅ Eat</span>
                    <ul>{info.diet.recommended.slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}</ul>
                  </div>
                  <div className="mp-diet-bad">
                    <span className="mp-diet-label">❌ Avoid</span>
                    <ul>{info.diet.avoid.slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}</ul>
                  </div>
                </div>
              </div>
              <div className="mp-detail-section full">
                <h5><span className="mp-detail-icon">💡</span> Key Awareness</h5>
                <ul className="mp-awareness-list">
                  {info.awareness.slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HealthSummaryCard({ icon, title, value, subtitle, color }) {
  return (
    <motion.div 
      className="mp-summary-card"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ '--card-color': color }}
    >
      <div className="mp-summary-icon">{icon}</div>
      <div className="mp-summary-content">
        <span className="mp-summary-value">{value}</span>
        <span className="mp-summary-title">{title}</span>
        {subtitle && <span className="mp-summary-sub">{subtitle}</span>}
      </div>
    </motion.div>
  );
}

function MedPredictPage() {
  const [step, setStep] = useState('idle');
  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [showText, setShowText] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [allPredictions, setAllPredictions] = useState([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [modelReady, setModelReady] = useState(isModelReady);
  const [expandedCard, setExpandedCard] = useState(0);
  const [analysisTime, setAnalysisTime] = useState(0);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    if (modelReady) return;
    const interval = setInterval(() => {
      if (isModelReady()) {
        setModelReady(true);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [modelReady]);

  const resetAll = useCallback(() => {
    setStep('idle');
    setFile(null);
    setExtractedText('');
    setShowText(false);
    setPredictions([]);
    setAllPredictions([]);
    setProgress(0);
    setError('');
    setExpandedCard(0);
    setAnalysisTime(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const processFile = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    
    if (!isSupportedFile(selectedFile)) {
      setError('Unsupported file type. Please upload a PDF or image (JPG, PNG, etc.)');
      return;
    }
    
    setFile(selectedFile);
    setError('');
    setPredictions([]);
    setAllPredictions([]);
    setExtractedText('');
    const startTime = Date.now();

    try {
      setStep('extracting');
      setProgress(0);
      const text = await extractText(selectedFile, setProgress);

      if (!text || text.trim().length < 20) {
        setError('Could not extract enough text. Please try a clearer image or text-based PDF.');
        setStep('idle');
        return;
      }
      setExtractedText(text);

      if (!isModelReady()) {
        setStep('loading-model');
        setProgress(0);
      } else {
        setStep('predicting');
      }
      
      const [filtered, all] = await Promise.all([
        predictDiseases(text, setProgress, { minConfidence: 50 }),
        predictDiseases(text, null, { returnAll: true }),
      ]);

      setStep('done');
      setModelReady(true);
      setPredictions(filtered);
      setAllPredictions(all);
      setAnalysisTime(((Date.now() - startTime) / 1000).toFixed(1));
      
      if (filtered.length > 0) {
        setExpandedCard(0);
      }
    } catch (err) {
      console.error('MedPredict error:', err);
      setError(err.message || 'An error occurred. Please try again.');
      setStep('idle');
    }
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.remove('drag-over');
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) processFile(droppedFile);
  }, [processFile]);

  const handleDragOver = (e) => {
    e.preventDefault();
    dropRef.current?.classList.add('drag-over');
  };

  const handleDragLeave = () => {
    dropRef.current?.classList.remove('drag-over');
  };

  const topPrediction = predictions[0];
  const urgency = getUrgencyRecommendation(predictions);
  const highRiskCount = predictions.filter(p => p.score >= 60).length;
  const moderateRiskCount = predictions.filter(p => p.score >= 50 && p.score < 60).length;

  return (
    <div className="mp-page">
      <motion.header className="mp-hero" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mp-hero-badge">AI-Powered Analysis</div>
        <h1 className="mp-title">
          <span className="mp-title-icon">🏥</span>
          MedPredict
        </h1>
        <p className="mp-subtitle">
          Upload your medical report for instant AI-powered disease predictions, health insights, and personalized recommendations.
        </p>
      </motion.header>

      <StepIndicator currentStep={step} />

      {step === 'idle' && (
        <motion.div
          className="mp-upload-zone"
          ref={dropRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFileChange}
            capture="environment"
            hidden
          />
          <div className="mp-upload-visual">
            <div className="mp-upload-icon-ring">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="mp-upload-pulse" />
          </div>
          <h3 className="mp-upload-title">Upload Medical Report</h3>
          <p className="mp-upload-hint">
            Drag & drop or <span className="mp-upload-link">browse files</span>
          </p>
          <div className="mp-upload-formats">
            <span>📄 PDF</span>
            <span>🖼️ JPG/PNG</span>
            <span>📱 Camera</span>
          </div>
          <div className={`mp-model-badge ${modelReady ? 'ready' : 'loading'}`}>
            <span className="mp-badge-dot" />
            {modelReady ? 'AI Ready — Instant Analysis' : 'Loading AI Model...'}
          </div>
        </motion.div>
      )}

      {(step === 'extracting' || step === 'loading-model' || step === 'predicting') && (
        <motion.div className="mp-processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="mp-processing-visual">
            <div className="mp-spinner-ring">
              <div className="mp-spinner-core" />
            </div>
            <span className="mp-processing-icon">
              {step === 'extracting' && '📄'}
              {step === 'loading-model' && '🧠'}
              {step === 'predicting' && '🔬'}
            </span>
          </div>
          <h3 className="mp-processing-title">
            {step === 'extracting' && 'Extracting Text...'}
            {step === 'loading-model' && 'Loading AI Model...'}
            {step === 'predicting' && 'Analyzing Report...'}
          </h3>
          <p className="mp-processing-hint">
            {step === 'extracting' && 'Reading your medical document'}
            {step === 'loading-model' && 'First load may take 15-30 seconds'}
            {step === 'predicting' && 'Identifying potential health conditions'}
          </p>
          {progress > 0 && (
            <div className="mp-progress-container">
              <div className="mp-progress-bar">
                <motion.div 
                  className="mp-progress-fill" 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <span className="mp-progress-text">{progress}%</span>
            </div>
          )}
          {file && <p className="mp-file-name">📎 {file.name}</p>}
        </motion.div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div className="mp-error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <span className="mp-error-icon">⚠️</span>
            <span className="mp-error-text">{error}</span>
            <button className="mp-error-btn" onClick={resetAll}>Try Again</button>
          </motion.div>
        )}
      </AnimatePresence>

      {step === 'done' && (
        <motion.div className="mp-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="mp-results-header">
            <div>
              <h2 className="mp-results-title">Analysis Complete</h2>
              <p className="mp-results-meta">Analyzed in {analysisTime}s • {predictions.length} condition{predictions.length !== 1 ? 's' : ''} detected</p>
            </div>
            <button className="mp-new-btn" onClick={resetAll}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 105.64-11.36L1 10" />
              </svg>
              New Analysis
            </button>
          </div>

          {urgency && (
            <motion.div 
              className="mp-urgency-banner"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ '--urgency-color': urgency.color }}
            >
              <span className="mp-urgency-icon">{urgency.icon}</span>
              <span className="mp-urgency-text">{urgency.message}</span>
            </motion.div>
          )}

          <div className="mp-summary-grid">
            <HealthSummaryCard 
              icon="🎯" 
              title="Conditions Found" 
              value={predictions.length}
              subtitle=">50% confidence"
              color="#6366f1"
            />
            <HealthSummaryCard 
              icon="🔴" 
              title="High Risk" 
              value={highRiskCount}
              subtitle="≥60% match"
              color="#dc2626"
            />
            <HealthSummaryCard 
              icon="🟡" 
              title="Moderate Risk" 
              value={moderateRiskCount}
              subtitle="50-59% match"
              color="#ca8a04"
            />
            <HealthSummaryCard 
              icon="⏱️" 
              title="Analysis Time" 
              value={`${analysisTime}s`}
              subtitle="AI processing"
              color="#0891b2"
            />
          </div>

          {topPrediction && (
            <div className="mp-top-result">
              <h3 className="mp-section-title">
                <span>📊</span> Primary Finding
              </h3>
              <RiskGauge score={topPrediction.score} disease={topPrediction.disease} />
            </div>
          )}

          {predictions.length > 0 ? (
            <div className="mp-predictions-section">
              <h3 className="mp-section-title">
                <span>🔬</span> Detected Conditions ({'>'}50% Confidence)
              </h3>
              <div className="mp-predictions-list">
                {predictions.map((p, i) => (
                  <PredictionCard
                    key={p.disease}
                    prediction={p}
                    rank={i}
                    isExpanded={expandedCard === i}
                    onToggle={() => setExpandedCard(expandedCard === i ? -1 : i)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="mp-no-results">
              <span className="mp-no-icon">✅</span>
              <h3>No High-Confidence Conditions Detected</h3>
              <p>No conditions exceeded 50% confidence. This is generally a positive sign, but always consult a healthcare provider for proper diagnosis.</p>
            </div>
          )}

          {extractedText && (
            <div className="mp-text-section">
              <button className="mp-text-toggle" onClick={() => setShowText(!showText)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points={showText ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
                </svg>
                {showText ? 'Hide' : 'Show'} Extracted Text ({extractedText.length} chars)
              </button>
              <AnimatePresence>
                {showText && (
                  <motion.pre
                    className="mp-extracted-text"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    {extractedText}
                  </motion.pre>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="mp-disclaimer">
            <span className="mp-disclaimer-icon">⚠️</span>
            <div>
              <strong>Medical Disclaimer:</strong> This AI tool provides predictions for informational purposes only. 
              It is <strong>not</strong> a substitute for professional medical advice, diagnosis, or treatment. 
              Always consult a qualified healthcare provider.
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default MedPredictPage;
