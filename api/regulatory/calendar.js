const PDUFA_SAMPLE = [
  { date: '2025-03-15', drug: 'Donanemab', indication: "Alzheimer's disease", sponsor: 'Eli Lilly', type: 'PDUFA' },
  { date: '2025-04-01', drug: 'Resmetirom', indication: 'NASH/MASH', sponsor: 'Madrigal Pharmaceuticals', type: 'PDUFA' },
  { date: '2025-04-15', drug: 'Olezarsen', indication: 'Familial chylomicronemia syndrome', sponsor: 'Ionis', type: 'PDUFA' },
  { date: '2025-05-20', drug: 'Datopotamab deruxtecan', indication: 'EGFR-mutated NSCLC', sponsor: 'Daiichi Sankyo/AstraZeneca', type: 'PDUFA' },
  { date: '2025-06-10', drug: 'Tirzepatide', indication: 'NASH', sponsor: 'Eli Lilly', type: 'PDUFA' },
  { date: '2025-07-01', drug: 'Bemarituzumab', indication: 'Gastric/GEJ cancer', sponsor: 'Five Prime/Amgen', type: 'PDUFA' },
  { date: '2025-08-15', drug: 'Efanesoctocog alfa', indication: 'Hemophilia A', sponsor: 'Sanofi', type: 'PDUFA' },
  { date: '2025-09-30', drug: 'Zolbetuximab', indication: 'CLDN18.2+ gastric cancer', sponsor: 'Astellas', type: 'PDUFA' },
  { date: '2025-10-15', drug: 'Vepdegestrant', indication: 'ER+ breast cancer', sponsor: 'Arvinas/Pfizer', type: 'PDUFA' },
  { date: '2025-11-20', drug: 'Giredestrant', indication: 'ER+ breast cancer', sponsor: 'Roche', type: 'PDUFA' },
  { date: '2025-12-01', drug: 'Lovotibeglogene autotemcel', indication: 'Sickle cell disease', sponsor: 'bluebird bio', type: 'PDUFA' },
  { date: '2026-01-15', drug: 'Odronextamab', indication: 'B-cell lymphoma', sponsor: 'Regeneron', type: 'PDUFA' },
  { date: '2026-02-28', drug: 'Tarlatamab', indication: 'SCLC', sponsor: 'Amgen', type: 'PDUFA' },
];

const ADVISORY = [
  { date: '2025-03-05', topic: 'Oncology Drug Advisory Committee', drug: 'Multiple', type: 'Advisory' },
  { date: '2025-04-10', topic: 'Psychopharmacologic Drugs Advisory Committee', drug: 'Depression/Anxiety', type: 'Advisory' },
  { date: '2025-05-15', topic: 'Cardiovascular and Renal Drugs Advisory Committee', drug: 'Heart failure', type: 'Advisory' },
  { date: '2025-06-20', topic: 'Endocrinologic and Metabolic Drugs Advisory Committee', drug: 'Obesity/Diabetes', type: 'Advisory' },
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type = '', from = '', to = '', limit = '50' } = req.query;
    const lim = Math.min(parseInt(limit, 10) || 50, 100);

    let items = [...PDUFA_SAMPLE, ...ADVISORY].map((x) => ({ ...x, id: `${x.date}-${x.drug}-${x.type}` }));

    if (type) {
      const t = type.toLowerCase();
      items = items.filter((x) => x.type.toLowerCase().includes(t));
    }

    if (from) {
      items = items.filter((x) => x.date >= from);
    }
    if (to) {
      items = items.filter((x) => x.date <= to);
    }

    items.sort((a, b) => a.date.localeCompare(b.date));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({
      total: items.length,
      items: items.slice(0, lim),
      source: 'Curated PDUFA & Advisory Committee data. Update via api/regulatory/calendar.js',
    });
  } catch (err) {
    console.error('[regulatory/calendar]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
