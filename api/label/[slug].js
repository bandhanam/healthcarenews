const OPENFDA = 'https://api.fda.gov/drug/label.json';

function normalizeSlug(slug) {
  if (Array.isArray(slug)) return slug.filter(Boolean);
  if (typeof slug === 'string' && slug.trim()) return [slug.trim()];
  return [];
}

function simpleDiff(a, b) {
  if (!a && !b) return { added: [], removed: [], unchanged: true };
  const aLines = (a || '').split(/\n+/).filter(Boolean);
  const bLines = (b || '').split(/\n+/).filter(Boolean);
  const aSet = new Set(aLines);
  const bSet = new Set(bLines);
  const added = bLines.filter((l) => !aSet.has(l));
  const removed = aLines.filter((l) => !bSet.has(l));
  return { added, removed, unchanged: added.length === 0 && removed.length === 0 };
}

async function handleDiff(query, res) {
  const { id1 = '', id2 = '', application_number = '' } = query;

  if (id1 && id2) {
    const [r1, r2] = await Promise.all([
      fetch(`${OPENFDA}?search=id:"${encodeURIComponent(id1)}"&limit=1`).then((r) => r.json()),
      fetch(`${OPENFDA}?search=id:"${encodeURIComponent(id2)}"&limit=1`).then((r) => r.json()),
    ]);
    const d1 = r1.results?.[0];
    const d2 = r2.results?.[0];
    if (!d1 || !d2) return res.status(404).json({ error: 'One or both labels not found' });

    const sections = ['purpose', 'indications_and_usage', 'warnings', 'dosage_and_administration', 'adverse_reactions', 'drug_interactions', 'contraindications'];
    const diffs = {};
    for (const sec of sections) {
      const v1 = d1[sec]?.[0] || '';
      const v2 = d2[sec]?.[0] || '';
      diffs[sec] = simpleDiff(v1, v2);
    }

    return res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate').status(200).json({
      older: { id: d1.id, effective_time: d1.effective_time, version: d1.version },
      newer: { id: d2.id, effective_time: d2.effective_time, version: d2.version },
      diffs,
    });
  }

  if (application_number) {
    const search = encodeURIComponent(`openfda.application_number:"${application_number}"`);
    const resp = await fetch(`${OPENFDA}?search=${search}&limit=100&sort=effective_time:asc`);
    const data = await resp.json();
    const results = data.results || [];
    if (results.length < 2) {
      return res.status(200).json({ versions: results, message: 'Need at least 2 versions to diff' });
    }
    const v1 = results[0];
    const v2 = results[results.length - 1];
    const sections = ['indications_and_usage', 'warnings', 'dosage_and_administration', 'adverse_reactions'];
    const diffs = {};
    for (const sec of sections) {
      const a = v1[sec]?.[0] || '';
      const b = v2[sec]?.[0] || '';
      diffs[sec] = simpleDiff(a, b);
    }
    return res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate').status(200).json({
      older: { id: v1.id, effective_time: v1.effective_time },
      newer: { id: v2.id, effective_time: v2.effective_time },
      all_versions: results.map((r) => ({ id: r.id, effective_time: r.effective_time, version: r.version })),
      diffs,
    });
  }

  return res.status(400).json({ error: 'Provide id1+id2 or application_number' });
}

async function handleVersions(query, res) {
  const { q = '', limit = '50' } = query;
  if (!q.trim()) {
    return res.status(400).json({ error: 'Query q (drug name) is required' });
  }

  const search = encodeURIComponent(`openfda.brand_name:"${q}" OR openfda.generic_name:"${q}"`);
  const lim = Math.min(parseInt(limit, 10) || 50, 100);
  const url = `${OPENFDA}?search=${search}&limit=${lim}&sort=effective_time:desc`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!resp.ok) throw new Error('openFDA request failed');
  const data = await resp.json();

  const results = (data.results || []).map((r) => {
    const openfda = r.openfda || {};
    const purpose = r.purpose?.[0] || '';
    const indications = r.indications_and_usage?.[0] || '';
    const warnings = r.warnings?.[0] || '';
    const dosage = r.dosage_and_administration?.[0] || '';
    return {
      id: r.id,
      application_number: openfda.application_number?.[0] || '',
      brand_name: openfda.brand_name?.[0] || '',
      generic_name: openfda.generic_name?.[0] || '',
      manufacturer: openfda.manufacturer_name?.[0] || '',
      effective_time: r.effective_time || '',
      version: r.version || '',
      purpose: purpose.slice(0, 500),
      indications: indications.slice(0, 2000),
      warnings: warnings.slice(0, 2000),
      dosage: dosage.slice(0, 1000),
      sections: {
        purpose,
        indications_and_usage: indications,
        warnings,
        dosage_and_administration: dosage,
        adverse_reactions: r.adverse_reactions?.[0] || '',
        drug_interactions: r.drug_interactions?.[0] || '',
        contraindications: r.contraindications?.[0] || '',
      },
    };
  });

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  return res.status(200).json({
    total: data.meta?.results?.total || results.length,
    query: q,
    versions: results,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const [action] = normalizeSlug(req.query.slug);

  try {
    if (action === 'diff') return await handleDiff(req.query, res);
    if (action === 'versions') return await handleVersions(req.query, res);

    return res.status(404).json({ error: 'Unknown label route', available: ['diff', 'versions'] });
  } catch (err) {
    console.error('[label]', err.message);
    return res.status(500).json({ error: err.message || 'Failed to process label request' });
  }
}
