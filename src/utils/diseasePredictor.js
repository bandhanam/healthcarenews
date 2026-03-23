import { pipeline } from '@huggingface/transformers';

const DISEASE_LABELS = [
  'diabetes',
  'hypertension',
  'anemia',
  'cancer',
  'thyroid disorder',
  'kidney disease',
  'liver disease',
  'heart disease',
  'tuberculosis',
  'malaria',
  'dengue',
  'high cholesterol',
  'vitamin deficiency',
  'urinary tract infection',
  'pneumonia',
  'asthma',
  'COPD',
  'arthritis',
  'osteoporosis',
  'HIV/AIDS',
  'hepatitis',
  'stroke',
  'epilepsy',
  'Parkinson disease',
  'Alzheimer disease',
  'PCOS',
  'jaundice',
  'sepsis',
  'meningitis',
  'lupus',
];

const CACHE_KEY = '__medpredict_classifier';
let _loadingPromise = null;

function getCachedClassifier() {
  return window[CACHE_KEY] || null;
}

function setCachedClassifier(instance) {
  window[CACHE_KEY] = instance;
}

async function getClassifier(onProgress) {
  const cached = getCachedClassifier();
  if (cached) return cached;

  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = pipeline(
    'zero-shot-classification',
    'Xenova/mobilebert-uncased-mnli',
    {
      progress_callback: (progress) => {
        if (onProgress && progress.status === 'progress') {
          onProgress(Math.round(progress.progress));
        }
      },
    },
  ).then((instance) => {
    setCachedClassifier(instance);
    _loadingPromise = null;
    return instance;
  });

  return _loadingPromise;
}

export function isModelReady() {
  return getCachedClassifier() !== null;
}

export function preloadModel() {
  if (getCachedClassifier() || _loadingPromise) return;
  getClassifier(null).catch(() => {});
}

function truncateText(text, maxTokens = 384) {
  const words = text.split(/\s+/);
  if (words.length <= maxTokens) return text;
  return words.slice(0, maxTokens).join(' ');
}

function extractKeyMedicalTerms(text) {
  const medicalKeywords = [
    'glucose', 'sugar', 'blood', 'pressure', 'cholesterol', 'hemoglobin', 'hba1c',
    'creatinine', 'urea', 'bilirubin', 'albumin', 'protein', 'sodium', 'potassium',
    'calcium', 'iron', 'ferritin', 'thyroid', 'tsh', 't3', 't4', 'vitamin',
    'platelet', 'wbc', 'rbc', 'esr', 'crp', 'liver', 'kidney', 'heart', 'lung',
    'diabetes', 'hypertension', 'anemia', 'infection', 'fever', 'pain', 'fatigue',
    'weight', 'bmi', 'pulse', 'ecg', 'xray', 'ct', 'mri', 'ultrasound',
    'positive', 'negative', 'abnormal', 'normal', 'elevated', 'low', 'high',
    'mg/dl', 'mmol', 'iu/l', 'g/dl', 'cells', 'count', 'level', 'range',
    'urine', 'stool', 'cough', 'breathless', 'swelling', 'rash', 'nausea'
  ];
  
  const lower = text.toLowerCase();
  const sentences = text.split(/[.!?\n]+/).filter(s => s.trim().length > 10);
  
  const relevantSentences = sentences.filter(sentence => {
    const lowerSentence = sentence.toLowerCase();
    return medicalKeywords.some(keyword => lowerSentence.includes(keyword));
  });
  
  if (relevantSentences.length > 0) {
    return relevantSentences.slice(0, 15).join('. ');
  }
  
  return text;
}

const SYMPTOM_TEXT_MAX_WORDS = 120;

function compactSymptomText(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= SYMPTOM_TEXT_MAX_WORDS) return text;
  return `${words.slice(0, SYMPTOM_TEXT_MAX_WORDS).join(' ')}… [truncated for speed]`;
}

export async function predictDiseases(text, onModelProgress, options = {}) {
  const { minConfidence = 50, returnAll = false, symptomListMode = false } = options;

  const classifier = await getClassifier(onModelProgress);

  let medicalText = extractKeyMedicalTerms(text);
  if (symptomListMode) {
    medicalText = compactSymptomText(medicalText);
  }
  const input = truncateText(medicalText);
  
  const result = await classifier(input, DISEASE_LABELS, {
    multi_label: true,
  });

  const predictions = result.labels.map((label, i) => ({
    disease: label,
    score: Math.round(result.scores[i] * 1000) / 10,
    confidence: result.scores[i] >= 0.5 ? 'high' : result.scores[i] >= 0.3 ? 'medium' : 'low',
  }));

  if (returnAll) {
    return predictions;
  }

  const filtered = predictions.filter(p => p.score >= minConfidence);
  
  if (filtered.length === 0) {
    return predictions.slice(0, 3).map(p => ({
      ...p,
      note: 'Low confidence - consult a healthcare provider for accurate diagnosis'
    }));
  }

  return filtered;
}

export function getRiskLevel(score) {
  if (score >= 80) return { level: 'Critical', color: '#dc2626', icon: '🔴' };
  if (score >= 60) return { level: 'High', color: '#ea580c', icon: '🟠' };
  if (score >= 50) return { level: 'Moderate', color: '#ca8a04', icon: '🟡' };
  return { level: 'Low', color: '#16a34a', icon: '🟢' };
}

export function getUrgencyRecommendation(predictions) {
  if (!predictions || predictions.length === 0) return null;
  
  const maxScore = Math.max(...predictions.map(p => p.score));
  const criticalDiseases = ['cancer', 'stroke', 'sepsis', 'meningitis', 'heart disease'];
  const hasCritical = predictions.some(p => 
    criticalDiseases.includes(p.disease.toLowerCase()) && p.score >= 50
  );
  
  if (hasCritical || maxScore >= 80) {
    return {
      level: 'urgent',
      message: 'Seek immediate medical consultation',
      color: '#dc2626',
      icon: '🚨'
    };
  }
  
  if (maxScore >= 60) {
    return {
      level: 'soon',
      message: 'Schedule a doctor appointment within 1-2 days',
      color: '#ea580c',
      icon: '⚠️'
    };
  }
  
  if (maxScore >= 50) {
    return {
      level: 'routine',
      message: 'Consider a routine health check-up',
      color: '#ca8a04',
      icon: '📋'
    };
  }
  
  return {
    level: 'monitor',
    message: 'Continue monitoring your health',
    color: '#16a34a',
    icon: '✅'
  };
}

export { DISEASE_LABELS };
