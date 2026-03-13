export const DISEASE_LOGY_MAPPING = [
  { label: 'Cancer & Oncology', keywords: ['cancer', 'oncology', 'tumor', 'tumour', 'carcinoma', 'chemotherapy', 'leukemia', 'malignancy'] },
  { label: 'Mental Health', keywords: ['psychology', 'psychiatry', 'psychiatric', 'psychological', 'mental health', 'behavioral health', 'cognitive'] },
  { label: 'Neurology', keywords: ['neurology', 'neurological', 'neurodegenerative', 'neural', 'brain'] },
  { label: 'Cardiology', keywords: ['cardiology', 'cardiac', 'cardiovascular', 'heart'] },
  { label: 'Infectious Disease', keywords: ['infectious', 'infection', 'infectiology', 'pathogen', 'viral', 'bacterial'] },
  { label: 'Diabetes', keywords: ['diabetes', 'diabetic', 'insulin', 'glucose', 'blood sugar', 'glycemic'] },
  { label: 'Rheumatology', keywords: ['rheumatology', 'rheumatoid', 'arthritis', 'lupus'] },
  { label: 'Pulmonology', keywords: ['pulmonology', 'pulmonary', 'respiratory', 'copd', 'asthma'] },
];

export const DISEASES_AND_LOGIES = [
  'Allergology', 'Anesthesiology', 'Cardiology', 'Dermatology', 'Endocrinology',
  'Gastroenterology', 'Hematology', 'Immunology', 'Nephrology', 'Neurology',
  'Oncology', 'Ophthalmology', 'Pathology', 'Pharmacology', 'Pulmonology',
  'Radiology', 'Rheumatology', 'Urology', 'Virology',
  'Alzheimer', 'Arthritis', 'Asthma', 'Cancer', 'Chronic', 'Copd', 'Dementia',
  'Diabetes', 'Disease', 'Hypertension', 'Infection', 'Obesity', 'Parkinson',
  'Stroke', 'Syndrome', 'Tuberculosis',
];

export function getCanonicalDiseaseLogyLabel(term) {
  if (!term) return '';
  const k = String(term).toLowerCase().trim();
  for (const { label, keywords } of DISEASE_LOGY_MAPPING) {
    if (keywords.some((kw) => kw.toLowerCase() === k)) return label;
    if (label.toLowerCase() === k) return label;
  }
  return k ? k.charAt(0).toUpperCase() + k.slice(1) : '';
}

export function getKeywordsForCanonicalLabel(label) {
  if (!label) return [];
  const entry = DISEASE_LOGY_MAPPING.find((e) => e.label.toLowerCase() === String(label).toLowerCase().trim());
  return entry ? entry.keywords : [String(label).toLowerCase().trim()];
}

export function articleMatchesDiseasesOrLogies(article, selectedLabels) {
  if (!selectedLabels || selectedLabels.length === 0) return true;
  const text = [
    article.title || '', article.excerpt || '', article.content || '',
    article.category || '',
    ...(Array.isArray(article.tags) ? article.tags : []),
    ...(Array.isArray(article.keywords) ? article.keywords : []),
  ].join(' ').toLowerCase();
  return selectedLabels.some((label) => {
    const keywords = getKeywordsForCanonicalLabel(label);
    return keywords.some((kw) => kw && text.includes(kw));
  });
}
