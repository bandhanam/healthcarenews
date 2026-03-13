export const CATEGORY_LIST = [
  { key: 'All', label: 'All' },
  { key: 'Genics', label: 'Genics' },
  { key: 'Healthcare_Reform', label: 'Healthcare Reform' },
  { key: 'Infectious_Disease', label: 'Infectious Disease' },
  { key: 'Vaccines', label: 'Vaccines' },
  { key: 'Medical_Aesthetics', label: 'Medical Aesthetics' },
  { key: 'Healthcare_Education', label: 'Healthcare Education' },
  { key: 'Biotechnology', label: 'Biotechnology' },
  { key: 'Medical_Devices', label: 'Medical Devices' },
  { key: 'Pharmaceuticals', label: 'Pharmaceuticals & Drugs' },
  { key: 'Diseases', label: 'Diseases' },
  { key: 'Mental_Health', label: 'Mental Health' },
  { key: 'Clinical_Trials', label: 'Clinical Trials & Research' },
  { key: 'Digital_Health', label: 'Digital Health' },
  { key: 'Public_Health', label: 'Public Health' },
  { key: 'Regulation_Policy', label: 'Regulation & Policy' },
  { key: 'Cancer_Oncology', label: 'Cancer & Oncology' },
  { key: 'Other', label: 'Other' },
];

export const CATEGORY_KEYS = CATEGORY_LIST.map((c) => c.key);

export const CATEGORY_KEYWORDS = {
  Genics: ['genics', 'gene ', 'genetic', 'genome', 'genomics', 'gene therapy', 'gene editing', 'crispr', 'dna', 'rna'],
  Healthcare_Reform: ['healthcare reform', 'medicare', 'medicaid', 'health policy', 'health system', 'health funding', 'insurance reform', 'reform'],
  Infectious_Disease: ['infectious', 'infection', 'virus', 'nipah', 'hiv', 'outbreak', 'epidemic', 'pandemic', 'pathogen', 'viral', 'bacterial'],
  Vaccines: ['vaccine', 'vaccines', 'vaccination', 'immunization', 'immunisation', 'immunity'],
  Medical_Aesthetics: ['aesthetics', 'aesthetic', 'cosmetic', 'medical aesthetics'],
  Healthcare_Education: ['healthcare education', 'medical education', 'training', 'accreditation', 'medical school'],
  Biotechnology: ['biotechnology', 'biotech', 'bio tech', 'synthetic biology', 'biopharma', 'biologics'],
  Medical_Devices: ['medical device', 'medical devices', 'medtech', 'implant', 'diagnostic device', 'surgical device'],
  Pharmaceuticals: ['pharmaceutical', 'pharma', 'drug', 'drugs', 'medication', 'medicine', 'treatment', 'therapy', 'fda approval'],
  Diseases: ['disease', 'diseases', 'diabetes', 'sickle cell', 'hypertension', 'dementia', 'alzheimer', 'obesity', 'chronic'],
  Mental_Health: ['mental health', 'depression', 'anxiety', 'psychiatric', 'psychology', 'cognitive', 'behavioral health'],
  Clinical_Trials: ['clinical trial', 'clinical trials', 'research', 'study', 'phase 1', 'phase 2', 'phase 3', 'r&d'],
  Digital_Health: ['digital health', 'health tech', 'telehealth', 'telemedicine', 'health app', 'wearable'],
  Public_Health: ['public health', 'who', 'world health', 'cdc', 'prevention', 'community health'],
  Regulation_Policy: ['regulation', 'regulatory', 'fda', 'policy', 'law', 'legislation', 'approval', 'compliance'],
  Cancer_Oncology: ['cancer', 'oncology', 'tumor', 'tumour', 'chemotherapy', 'breast cancer', 'leukemia', 'carcinoma'],
  Other: [],
};

function getArticleText(article) {
  return [
    article.title || '',
    article.excerpt || '',
    article.content || '',
    article.category || '',
    ...(Array.isArray(article.tags) ? article.tags : []),
    ...(Array.isArray(article.keywords) ? article.keywords : []),
    ...(Array.isArray(article.drugs) ? article.drugs : []),
  ].join(' ').toLowerCase();
}

export function articleMatchesCategory(article, categoryKey) {
  if (categoryKey === 'All') return true;
  if (categoryKey === 'Other') {
    const others = CATEGORY_KEYS.filter((k) => k !== 'Other' && k !== 'All');
    return !others.some((k) => articleMatchesCategory(article, k));
  }
  const keywords = CATEGORY_KEYWORDS[categoryKey];
  if (!keywords || keywords.length === 0) return false;
  const text = getArticleText(article);
  return keywords.some((kw) => text.includes(kw.toLowerCase()));
}

export function getMatchingCategories(article) {
  const matched = CATEGORY_KEYS.filter((key) => articleMatchesCategory(article, key));
  return matched.length > 0 ? matched : ['Other'];
}

export function getCategoryLabel(key) {
  const found = CATEGORY_LIST.find((c) => c.key === key);
  return found ? found.label : (key || 'Other').replace(/_/g, ' ');
}
