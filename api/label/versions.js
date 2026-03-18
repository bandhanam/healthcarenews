const OPENFDA = 'https://api.fda.gov/drug/label.json';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q = '', limit = '50' } = req.query;
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
          warnings: warnings,
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
  } catch (err) {
    console.error('[label/versions]', err.message);
    return res.status(500).json({ error: err.message || 'Failed to fetch label versions' });
  }
}
