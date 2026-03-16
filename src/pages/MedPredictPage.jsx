import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { extractText } from '../utils/textExtractor';
import { predictDiseases, isModelReady } from '../utils/diseasePredictor';
import { getDiseaseInfo } from '../data/diseaseKnowledge';
import './MedPredictPage.css';

const ACCEPT = '.jpg,.jpeg,.png,.gif,.bmp,.webp,.pdf';

const STEPS = [
  { key: 'idle', label: 'Upload Report' },
  { key: 'extracting', label: 'Extracting Text' },
  { key: 'loading-model', label: 'Loading AI Model' },
  { key: 'predicting', label: 'Analyzing Report' },
  { key: 'done', label: 'Results Ready' },
];

function StepIndicator({ currentStep }) {
  const idx = STEPS.findIndex((s) => s.key === currentStep);
  return (
    <div className="mp-steps">
      {STEPS.map((step, i) => (
        <div
          key={step.key}
          className={`mp-step ${i < idx ? 'completed' : ''} ${i === idx ? 'active' : ''}`}
        >
          <div className="mp-step-dot">
            {i < idx ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <span>{i + 1}</span>
            )}
          </div>
          <span className="mp-step-label">{step.label}</span>
        </div>
      ))}
    </div>
  );
}

function PredictionBar({ disease, score, rank, maxScore }) {
  const width = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return (
    <motion.div
      className="mp-pred-row"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.12, duration: 0.4 }}
    >
      <span className="mp-pred-rank">#{rank + 1}</span>
      <div className="mp-pred-info">
        <span className="mp-pred-name">{disease}</span>
        <div className="mp-pred-bar-track">
          <motion.div
            className="mp-pred-bar-fill"
            initial={{ width: 0 }}
            animate={{ width: `${width}%` }}
            transition={{ delay: rank * 0.12 + 0.2, duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>
      <span className="mp-pred-score">{score}%</span>
    </motion.div>
  );
}

function InfoCard({ title, icon, children }) {
  return (
    <motion.div
      className="mp-info-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 className="mp-info-title">
        <span className="mp-info-icon">{icon}</span>
        {title}
      </h3>
      <div className="mp-info-body">{children}</div>
    </motion.div>
  );
}

function MedPredictPage() {
  const [step, setStep] = useState('idle');
  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [showText, setShowText] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [modelReady, setModelReady] = useState(isModelReady);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    if (modelReady) return;
    const interval = setInterval(() => {
      if (isModelReady()) {
        setModelReady(true);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [modelReady]);

  const resetAll = useCallback(() => {
    setStep('idle');
    setFile(null);
    setExtractedText('');
    setShowText(false);
    setPredictions([]);
    setProgress(0);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const processFile = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError('');
    setPredictions([]);
    setExtractedText('');

    try {
      setStep('extracting');
      setProgress(0);
      const text = await extractText(selectedFile, setProgress);

      if (!text || text.trim().length < 20) {
        setError('Could not extract enough text from the file. Please try a clearer image or a text-based PDF.');
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
      const results = await predictDiseases(text, setProgress);

      setStep('done');
      setModelReady(true);
      setPredictions(results);
    } catch (err) {
      console.error('MedPredict error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setStep('idle');
    }
  }, []);

  const handleFileChange = (e) => {
    processFile(e.target.files?.[0]);
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropRef.current?.classList.remove('drag-over');
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) processFile(droppedFile);
    },
    [processFile],
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    dropRef.current?.classList.add('drag-over');
  };

  const handleDragLeave = () => {
    dropRef.current?.classList.remove('drag-over');
  };

  const topDisease = predictions[0];
  const topDiseaseInfo = topDisease ? getDiseaseInfo(topDisease.disease) : null;
  const maxScore = predictions.length ? predictions[0].score : 1;

  return (
    <div className="mp-page">
      <motion.div
        className="mp-hero"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="mp-title">
          <svg className="mp-title-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          MedPredict
        </h1>
        <p className="mp-subtitle">
          Upload a medical diagnostic report to get AI-powered disease predictions, precautions, diet recommendations, and health awareness.
        </p>
      </motion.div>

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
          transition={{ duration: 0.4 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFileChange}
            hidden
          />
          <div className="mp-upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="mp-upload-text">
            Drag & drop your medical report here
          </p>
          <p className="mp-upload-hint">
            or click to browse — supports JPG, PNG, PDF
          </p>
          <div className={`mp-model-badge ${modelReady ? 'ready' : 'loading'}`}>
            <span className="mp-badge-dot" />
            {modelReady ? 'AI Model Ready — analysis will be instant' : 'AI Model loading in background...'}
          </div>
        </motion.div>
      )}

      {(step === 'extracting' || step === 'loading-model' || step === 'predicting') && (
        <motion.div
          className="mp-processing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="mp-spinner" />
          <p className="mp-processing-label">
            {step === 'extracting' && 'Extracting text from your report...'}
            {step === 'loading-model' && 'Loading AI model (first time may take 30-60 seconds)...'}
            {step === 'predicting' && 'Analyzing medical data...'}
          </p>
          {progress > 0 && (
            <div className="mp-progress-bar">
              <div className="mp-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
          {file && <p className="mp-file-name">{file.name}</p>}
        </motion.div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            className="mp-error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
            <button className="mp-error-dismiss" onClick={resetAll}>Try Again</button>
          </motion.div>
        )}
      </AnimatePresence>

      {step === 'done' && predictions.length > 0 && (
        <motion.div
          className="mp-results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mp-results-header">
            <h2>Analysis Results</h2>
            <button className="mp-new-btn" onClick={resetAll}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 105.64-11.36L1 10" />
              </svg>
              Analyze Another Report
            </button>
          </div>

          {extractedText && (
            <div className="mp-text-preview">
              <button
                className="mp-text-toggle"
                onClick={() => setShowText((p) => !p)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points={showText ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
                </svg>
                {showText ? 'Hide' : 'Show'} Extracted Text
              </button>
              <AnimatePresence>
                {showText && (
                  <motion.pre
                    className="mp-extracted-text"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {extractedText}
                  </motion.pre>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="mp-predictions-card">
            <h3 className="mp-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              Top 5 Disease Predictions
            </h3>
            {predictions.map((p, i) => (
              <PredictionBar
                key={p.disease}
                disease={p.disease}
                score={p.score}
                rank={i}
                maxScore={maxScore}
              />
            ))}
          </div>

          {topDiseaseInfo && (
            <div className="mp-details-grid">
              <InfoCard
                title="Precautions"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                }
              >
                <p className="mp-info-for">
                  For <strong>{topDisease.disease}</strong> ({topDisease.score}% match)
                </p>
                <ul className="mp-info-list">
                  {topDiseaseInfo.precautions.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </InfoCard>

              <InfoCard
                title="Diet Program"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8h1a4 4 0 010 8h-1" />
                    <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
                    <line x1="6" y1="1" x2="6" y2="4" />
                    <line x1="10" y1="1" x2="10" y2="4" />
                    <line x1="14" y1="1" x2="14" y2="4" />
                  </svg>
                }
              >
                <div className="mp-diet-section">
                  <h4 className="mp-diet-heading recommended">Recommended Foods</h4>
                  <ul className="mp-info-list">
                    {topDiseaseInfo.diet.recommended.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="mp-diet-section">
                  <h4 className="mp-diet-heading avoid">Foods to Avoid</h4>
                  <ul className="mp-info-list avoid">
                    {topDiseaseInfo.diet.avoid.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </InfoCard>

              <InfoCard
                title="Health Awareness"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                }
              >
                <ul className="mp-info-list awareness">
                  {topDiseaseInfo.awareness.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </InfoCard>
            </div>
          )}

          <div className="mp-disclaimer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p>
              <strong>Medical Disclaimer:</strong> This is an AI-based prediction tool for informational purposes only.
              It is <strong>not</strong> a substitute for professional medical advice, diagnosis, or treatment.
              Always consult a qualified healthcare provider for medical decisions.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default MedPredictPage;
