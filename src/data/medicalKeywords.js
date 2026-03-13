export const medicalKeywords = [
  'healthcare', 'medical', 'medicine', 'medication', 'patient', 'treatment',
  'hospital', 'clinical', 'physician', 'surgeon', 'nurse', 'disease', 'disorder',
  'diagnosis', 'pharmaceutical', 'pharma', 'drug', 'vaccine', 'vaccination',
  'clinical trial', 'FDA', 'oncology', 'cancer', 'cardiology', 'cardiac',
  'neurology', 'diabetes', 'infectious disease', 'infection', 'immunology',
  'medical device', 'telemedicine', 'telehealth', 'digital health',
  'surgery', 'chemotherapy', 'radiation', 'immunotherapy', 'gene therapy',
  'stem cell', 'precision medicine', 'biomarker', 'pandemic', 'epidemic',
  'mental health', 'psychiatric', 'depression', 'anxiety', 'alzheimer',
  'dementia', 'parkinson', 'arthritis', 'hypertension', 'stroke',
  'COPD', 'asthma', 'respiratory', 'research', 'biotech', 'biotechnology',
  'regulatory', 'regulation', 'approval', 'efficacy', 'safety',
];

export function filterMedicalTags(tags) {
  if (!tags || !Array.isArray(tags)) return [];
  return tags.filter((tag) => {
    if (!tag || typeof tag !== 'string') return false;
    const lower = tag.toLowerCase().trim();
    return medicalKeywords.some((kw) => lower.includes(kw.toLowerCase()));
  });
}
