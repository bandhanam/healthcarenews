const COUNTRY_ALIASES = {
  us: 'United States',
  usa: 'United States',
  'u.s.': 'United States',
  'u.s.a.': 'United States',
  'united states': 'United States',
  'united states of america': 'United States',
  uk: 'United Kingdom',
  'u.k.': 'United Kingdom',
  'united kingdom': 'United Kingdom',
  'great britain': 'United Kingdom',
  gb: 'United Kingdom',
};

export function normalizeCountry(value) {
  if (value == null || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return COUNTRY_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}
