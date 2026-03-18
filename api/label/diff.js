const OPENFDA = 'https://api.fda.gov/drug/label.json';

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id1 = '', id2 = '', application_number = '' } = req.query;

    if (id1 && id2) {
      const [r1, r2] = await Promise.all([
        fetch(`${OPENFDA}?search=id:"${encodeURIComponent(id1)}"&limit=1`).then((r) => r.json()),
        fetch(`${OPENFDA}?search=id:"${encodeURIComponent(id2)}"&limit=1`).then((r) => r.json()),
      ]);
      const d1 = r1.results?.[0];
      const d2 = r2.results?.[0];
      if (!d1 || !d2) return res.status(404).json({ error: 'One or both labels not found' });

      const sections = [
        'purpose',
        'indications_and_usage',
        'warnings',
        'dosage_and_administration',
        'adverse_reactions',
        'drug_interactions',
        'contraindications',
      ];
      const diffs = {};
      for (const sec of sections) {
        const v1 = d1[sec]?.[0] || '';
        const v2 = d2[sec]?.[0] || '';
        diffs[sec] = simpleDiff(v1, v2);
      }

      return res
        .setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
        .status(200)
        .json({
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
      return res
        .setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
        .status(200)
        .json({
          older: { id: v1.id, effective_time: v1.effective_time },
          newer: { id: v2.id, effective_time: v2.effective_time },
          all_versions: results.map((r) => ({ id: r.id, effective_time: r.effective_time, version: r.version })),
          diffs,
        });
    }

    return res.status(400).json({ error: 'Provide id1+id2 or application_number' });
  } catch (err) {
    console.error('[label/diff]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
