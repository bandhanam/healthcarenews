export function blank(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if (s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '';
  return s;
}
