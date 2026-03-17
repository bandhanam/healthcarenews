import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { predictDiseases, isModelReady } from '../utils/diseasePredictor';
import './SymptomAIPage.css';

const Q = ['#06b6d4','#0891b2','#0e7490','#155e75','#14b8a6','#0d9488','#0f766e','#115e59','#22d3ee','#67e8f9'];
const SEVERITY_COLORS = { high: '#ef4444', moderate: '#f59e0b', low: '#10b981' };

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

const SUGGESTED_SYMPTOMS = [
  { text: 'Frequent urination, increased thirst, fatigue, blurry vision', icon: '\uD83E\uDE78' },
  { text: 'Chest pain, shortness of breath, dizziness', icon: '\u2764\uFE0F' },
  { text: 'Persistent cough, fever, night sweats, weight loss', icon: '\uD83E\uDEC1' },
  { text: 'Joint pain, morning stiffness, swelling in hands', icon: '\uD83E\uDDB4' },
  { text: 'Severe headache, neck stiffness, sensitivity to light', icon: '\uD83E\uDDE0' },
  { text: 'Unexplained weight gain, cold sensitivity, dry skin', icon: '\uD83E\uDD8B' },
];

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

function getSeverity(score) {
  if (score >= 30) return 'high';
  if (score >= 15) return 'moderate';
  return 'low';
}

function ChatMessage({ msg, index }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      className={`sa-msg ${isUser ? 'sa-msg-user' : 'sa-msg-ai'}`}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="sa-msg-avatar">{isUser ? '\uD83D\uDC64' : '\uD83E\uDDA0'}</div>
      <div className="sa-msg-bubble">
        {msg.type === 'text' && <p>{msg.content}</p>}
        {msg.type === 'analysis' && <AnalysisResult data={msg.content} />}
        {msg.type === 'loading' && (
          <div className="sa-typing">
            <span /><span /><span />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AnalysisResult({ data }) {
  const { predictions, bodyData } = data;
  const topPrediction = predictions[0];
  const severity = getSeverity(topPrediction?.score || 0);

  return (
    <div className="sa-analysis">
      <div className="sa-analysis-header">
        <div className="sa-analysis-badge" style={{ background: `${SEVERITY_COLORS[severity]}18`, color: SEVERITY_COLORS[severity] }}>
          AI Analysis Complete
        </div>
        <p className="sa-analysis-note">Based on symptom pattern matching. Not a medical diagnosis.</p>
      </div>

      <div className="sa-predictions-grid">
        {predictions.map((p, i) => (
          <div key={p.disease} className="sa-pred-card">
            <div className="sa-pred-rank">#{i + 1}</div>
            <div className="sa-pred-info">
              <span className="sa-pred-name">{p.disease}</span>
              <div className="sa-pred-bar-wrap">
                <motion.div
                  className="sa-pred-bar"
                  style={{ background: Q[i % Q.length] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(p.score, 100)}%` }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                />
              </div>
            </div>
            <span className="sa-pred-score" style={{ color: Q[i % Q.length] }}>{p.score}%</span>
          </div>
        ))}
      </div>

      <div className="sa-charts-row">
        <div className="sa-chart-box">
          <h4>Confidence Distribution</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={predictions} layout="vertical" margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-text-dim, #94a3b8)' }} />
              <YAxis type="category" dataKey="disease" tick={{ fontSize: 11, fill: 'var(--color-text, #1e293b)' }} width={55} />
              <Tooltip formatter={(v) => [`${v}%`, 'Confidence']} contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border, #e2e8f0)', fontSize: '0.8rem' }} />
              <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                {predictions.map((_, i) => <Cell key={i} fill={Q[i % Q.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {bodyData.length > 0 && (
          <div className="sa-chart-box">
            <h4>Body Systems Affected</h4>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={bodyData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="var(--color-border, #e2e8f0)" />
                <PolarAngleAxis dataKey="system" tick={{ fontSize: 10, fill: 'var(--color-text-dim, #94a3b8)' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="sa-disclaimer">
        <span className="sa-disc-icon">\u26A0\uFE0F</span>
        <span>This is an AI-assisted analysis and should not replace professional medical advice. Please consult a healthcare provider for proper diagnosis.</span>
      </div>
    </div>
  );
}

function SymptomAIPage() {
  const [messages, setMessages] = useState([
    { role: 'ai', type: 'text', content: 'Hello! I\'m SymptomAI, your intelligent health assistant. Describe your symptoms and I\'ll analyze potential conditions using AI pattern matching. What symptoms are you experiencing?' },
  ]);
  const [input, setInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [modelProgress, setModelProgress] = useState(null);
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const analyzeSymptoms = useCallback(async (text) => {
    if (!text.trim() || analyzing) return;

    setMessages((prev) => [
      ...prev,
      { role: 'user', type: 'text', content: text },
      { role: 'ai', type: 'loading', content: null },
    ]);
    setInput('');
    setAnalyzing(true);
    setModelProgress(null);

    try {
      const predictions = await predictDiseases(text, (p) => setModelProgress(p));
      const bodyData = buildBodySystemData(predictions);
      setMessages((prev) => [
        ...prev.filter((m) => m.type !== 'loading'),
        { role: 'ai', type: 'analysis', content: { predictions, bodyData } },
        { role: 'ai', type: 'text', content: `I've identified ${predictions.length} potential conditions. The strongest match is "${predictions[0]?.disease}" at ${predictions[0]?.score}% confidence. Would you like to describe additional symptoms or check something else?` },
      ]);
      setTotalAnalyses((p) => p + 1);
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.type !== 'loading'),
        { role: 'ai', type: 'text', content: 'I had trouble analyzing those symptoms. Please try again or rephrase your description.' },
      ]);
    } finally {
      setAnalyzing(false);
      setModelProgress(null);
    }
  }, [analyzing]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    analyzeSymptoms(input);
  }, [input, analyzeSymptoms]);

  const modelReady = isModelReady();

  const analysisStats = useMemo(() => {
    const analyses = messages.filter(m => m.type === 'analysis');
    if (analyses.length === 0) return null;
    const allPreds = analyses.flatMap(a => a.content.predictions);
    const uniqueDiseases = [...new Set(allPreds.map(p => p.disease))];
    const avgConf = allPreds.length > 0 ? Math.round(allPreds.reduce((s, p) => s + p.score, 0) / allPreds.length) : 0;
    return { count: analyses.length, diseases: uniqueDiseases.length, avgConf };
  }, [messages]);

  return (
    <div className="sa-page">
      <div className="sa-hero">
        <span className="sa-hero-badge">SymptomAI</span>
        <h1 className="sa-title">Intelligent Symptom Analyzer</h1>
        <p className="sa-subtitle">AI-powered conversational health assistant using zero-shot medical classification</p>
      </div>

      {analysisStats && (
        <div className="sa-stats-row">
          <div className="sa-stat-chip"><span className="sa-stat-num">{analysisStats.count}</span><span>Analyses</span></div>
          <div className="sa-stat-chip"><span className="sa-stat-num">{analysisStats.diseases}</span><span>Conditions</span></div>
          <div className="sa-stat-chip"><span className="sa-stat-num">{analysisStats.avgConf}%</span><span>Avg Confidence</span></div>
          <div className="sa-stat-chip"><span className="sa-stat-num">{modelReady ? '\u2705' : '\u23F3'}</span><span>Model</span></div>
        </div>
      )}

      <div className="sa-chat-container">
        <div className="sa-chat-messages" ref={chatRef}>
          <AnimatePresence>
            {messages.map((msg, i) => <ChatMessage key={i} msg={msg} index={i} />)}
          </AnimatePresence>
          {analyzing && modelProgress !== null && (
            <motion.div className="sa-model-progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="sa-progress-bar">
                <motion.div className="sa-progress-fill" animate={{ width: `${modelProgress}%` }} />
              </div>
              <span>Loading AI model... {modelProgress}%</span>
            </motion.div>
          )}
        </div>

        <form className="sa-input-area" onSubmit={handleSubmit}>
          <input
            className="sa-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your symptoms... (e.g., headache, fever, fatigue)"
            disabled={analyzing}
          />
          <button type="submit" className={`sa-send-btn ${input.trim() ? 'active' : ''}`} disabled={!input.trim() || analyzing}>
            {analyzing ? (
              <div className="sa-btn-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            )}
          </button>
        </form>
      </div>

      <div className="sa-suggestions">
        <h3>Try these symptom combinations</h3>
        <div className="sa-suggestion-grid">
          {SUGGESTED_SYMPTOMS.map((s) => (
            <button key={s.text} className="sa-suggestion-card" onClick={() => { setInput(s.text); analyzeSymptoms(s.text); }} disabled={analyzing}>
              <span className="sa-sug-icon">{s.icon}</span>
              <span className="sa-sug-text">{s.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SymptomAIPage;
