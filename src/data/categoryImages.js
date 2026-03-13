const CATEGORY_IMAGES = {
  Genics: '/categories/genics.svg',
  Healthcare_Reform: '/categories/healthcare-reform.svg',
  Infectious_Disease: '/categories/infectious-disease.svg',
  Vaccines: '/categories/vaccines.svg',
  Medical_Aesthetics: '/categories/medical-aesthetics.svg',
  Healthcare_Education: '/categories/healthcare-education.svg',
  Biotechnology: '/categories/biotechnology.svg',
  Medical_Devices: '/categories/medical-devices.svg',
  Pharmaceuticals: '/categories/pharmaceuticals.svg',
  Diseases: '/categories/diseases.svg',
  Mental_Health: '/categories/mental-health.svg',
  Clinical_Trials: '/categories/clinical-trials.svg',
  Digital_Health: '/categories/digital-health.svg',
  Public_Health: '/categories/public-health.svg',
  Regulation_Policy: '/categories/regulation-policy.svg',
  Cancer_Oncology: '/categories/cancer-oncology.svg',
  Other: '/healthcare-banner.svg',
};

export function pickCategoryImage(categoryKey) {
  return CATEGORY_IMAGES[categoryKey] || CATEGORY_IMAGES.Other;
}

export { CATEGORY_IMAGES };
