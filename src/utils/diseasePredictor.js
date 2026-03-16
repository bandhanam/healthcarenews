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

let classifierInstance = null;

async function getClassifier(onProgress) {
  if (classifierInstance) return classifierInstance;

  classifierInstance = await pipeline(
    'zero-shot-classification',
    'Xenova/nli-deberta-v3-small',
    {
      progress_callback: (progress) => {
        if (onProgress && progress.status === 'progress') {
          onProgress(Math.round(progress.progress));
        }
      },
    },
  );

  return classifierInstance;
}

function truncateText(text, maxTokens = 512) {
  const words = text.split(/\s+/);
  if (words.length <= maxTokens) return text;
  return words.slice(0, maxTokens).join(' ');
}

export async function predictDiseases(text, onModelProgress) {
  const classifier = await getClassifier(onModelProgress);

  const input = truncateText(text);
  const result = await classifier(input, DISEASE_LABELS, {
    multi_label: true,
  });

  const predictions = result.labels.map((label, i) => ({
    disease: label,
    score: Math.round(result.scores[i] * 1000) / 10,
  }));

  return predictions.slice(0, 5);
}

export { DISEASE_LABELS };
