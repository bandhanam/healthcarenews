import { getPool } from '../_lib/db.js';

const PUG = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

const DRUG_NAMES = [
  'aspirin','ibuprofen','acetaminophen','metformin','atorvastatin','amlodipine',
  'lisinopril','omeprazole','metoprolol','losartan','simvastatin','levothyroxine',
  'amoxicillin','azithromycin','ciprofloxacin','prednisone','gabapentin','sertraline',
  'fluoxetine','escitalopram','duloxetine','venlafaxine','bupropion','aripiprazole',
  'quetiapine','alprazolam','lorazepam','diazepam','clonazepam','zolpidem',
  'tramadol','oxycodone','morphine','fentanyl','codeine','hydrocodone',
  'warfarin','clopidogrel','apixaban','rivaroxaban','enoxaparin','heparin',
  'insulin','semaglutide','liraglutide','empagliflozin','sitagliptin','glimepiride',
  'rosuvastatin','pravastatin','ezetimibe','fenofibrate','gemfibrozil',
  'albuterol','fluticasone','montelukast','tiotropium','budesonide','ipratropium',
  'furosemide','hydrochlorothiazide','spironolactone','chlorthalidone',
  'sildenafil','tadalafil','tamsulosin','finasteride','dutasteride',
  'cetirizine','loratadine','fexofenadine','diphenhydramine','ranitidine',
  'pantoprazole','esomeprazole','lansoprazole','famotidine','sucralfate',
  'doxycycline','levofloxacin','cephalexin','clindamycin','trimethoprim',
  'fluconazole','ketoconazole','terbinafine','nystatin','acyclovir','valacyclovir',
  'ondansetron','promethazine','metoclopramide','prochlorperazine',
  'adalimumab','infliximab','etanercept','rituximab','trastuzumab',
  'pembrolizumab','nivolumab','atezolizumab','ipilimumab','bevacizumab',
  'imatinib','erlotinib','sorafenib','sunitinib','lenalidomide','ibrutinib',
  'venetoclax','olaparib','palbociclib','osimertinib','larotrectinib',
  'dexamethasone','methylprednisolone','hydrocortisone','triamcinolone',
  'tacrolimus','cyclosporine','mycophenolate','azathioprine',
  'levodopa','carbidopa','pramipexole','ropinirole','rasagiline',
  'donepezil','memantine','rivastigmine','galantamine',
  'lithium','valproate','lamotrigine','carbamazepine','topiramate','phenytoin',
  'sumatriptan','rizatriptan','propranolol','verapamil',
  'testosterone','estradiol','progesterone','medroxyprogesterone',
  'levonorgestrel','ethinylestradiol','tamoxifen','letrozole','anastrozole',
  'erythropoietin','filgrastim','darbepoetin',
  'remdesivir','nirmatrelvir','molnupiravir','baricitinib',
  'ozempic','wegovy','mounjaro','tirzepatide',
  'caffeine','nicotine','ethanol','melatonin','vitamin d3','vitamin c',
  'zinc','magnesium','iron','calcium','potassium','sodium chloride',
  'penicillin','vancomycin','meropenem','linezolid','daptomycin',
  'amphotericin b','voriconazole','caspofungin',
  'methotrexate','cyclophosphamide','doxorubicin','cisplatin','paclitaxel',
  'vincristine','etoposide','fluorouracil','capecitabine','gemcitabine',
  'docetaxel','oxaliplatin','carboplatin','bleomycin','temozolomide',
];

const PROPERTIES = [
  'MolecularFormula','MolecularWeight','ExactMass','XLogP','TPSA',
  'Complexity','HBondDonorCount','HBondAcceptorCount','RotatableBondCount',
  'HeavyAtomCount','Charge','CanonicalSMILES','IsomericSMILES','InChI','InChIKey',
  'IUPACName',
].join(',');

function normalizeSlug(slug) {
  if (Array.isArray(slug)) return slug.filter(Boolean);
  if (typeof slug === 'string' && slug.trim()) return [slug.trim()];
  return [];
}

function isLipinskiCompliant(w) {
  return (
    (w.molecular_weight || 0) <= 500 &&
    (w.xlogp === null || w.xlogp <= 5) &&
    (w.hbond_donor || 0) <= 5 &&
    (w.hbond_acceptor || 0) <= 10
  );
}

async function fetchWithRetry(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (r.status === 404) return null;
      if (r.ok) return r.json();
      if (i < retries) await new Promise((ok) => setTimeout(ok, 1500));
    } catch {
      if (i < retries) await new Promise((ok) => setTimeout(ok, 2000));
    }
  }
  return null;
}

async function fetchCompound(name) {
  const encoded = encodeURIComponent(name);
  const propUrl = `${PUG}/compound/name/${encoded}/property/${PROPERTIES}/JSON`;
  const propData = await fetchWithRetry(propUrl);
  if (!propData?.PropertyTable?.Properties?.[0]) return null;

  const p = propData.PropertyTable.Properties[0];
  await new Promise((ok) => setTimeout(ok, 250));

  let synonyms = [];
  const synData = await fetchWithRetry(`${PUG}/compound/name/${encoded}/synonyms/JSON`);
  if (synData?.InformationList?.Information?.[0]?.Synonym) {
    synonyms = synData.InformationList.Information[0].Synonym.slice(0, 20);
  }

  const row = {
    cid: p.CID,
    name,
    iupac_name: p.IUPACName || null,
    molecular_formula: p.MolecularFormula || null,
    molecular_weight: p.MolecularWeight || null,
    exact_mass: p.ExactMass || null,
    xlogp: p.XLogP ?? null,
    tpsa: p.TPSA ?? null,
    complexity: p.Complexity ?? null,
    hbond_donor: p.HBondDonorCount ?? null,
    hbond_acceptor: p.HBondAcceptorCount ?? null,
    rotatable_bonds: p.RotatableBondCount ?? null,
    heavy_atom_count: p.HeavyAtomCount ?? null,
    charge: p.Charge ?? 0,
    canonical_smiles: p.CanonicalSMILES || null,
    isomeric_smiles: p.IsomericSMILES || null,
    inchi: p.InChI || null,
    inchikey: p.InChIKey || null,
    synonyms,
    image_url: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${p.CID}/PNG`,
  };
  row.drug_likeness = isLipinskiCompliant(row);

  return row;
}

async function handleSearch(pool, query, res) {
  const { q = '', cid = '', limit = '20', drug_likeness = '' } = query;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (cid) {
    conditions.push(`cid = $${idx}`);
    params.push(parseInt(cid, 10));
    idx++;
  } else if (q.trim()) {
    conditions.push(`(name ILIKE $${idx} OR iupac_name ILIKE $${idx} OR $${idx + 1} = ANY(synonyms) OR molecular_formula ILIKE $${idx})`);
    params.push(`%${q.trim()}%`, q.trim());
    idx += 2;
  }

  if (drug_likeness === 'true') {
    conditions.push('drug_likeness = TRUE');
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const lim = Math.min(parseInt(limit, 10) || 20, 100);

  const [rowsRes, countRes] = await Promise.all([
    pool.query(`SELECT * FROM pubchem_compounds ${where} ORDER BY molecular_weight ASC NULLS LAST LIMIT $${idx}`, [...params, lim]),
    pool.query(`SELECT COUNT(*) AS total FROM pubchem_compounds ${where}`, params),
  ]);

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  return res.status(200).json({
    total: parseInt(countRes.rows[0].total, 10),
    results: rowsRes.rows,
  });
}

async function handleSimilar(pool, query, res) {
  const { cid = '', limit = '10' } = query;
  if (!cid) return res.status(400).json({ error: 'cid is required' });

  const lim = Math.min(parseInt(limit, 10) || 10, 30);
  const target = await pool.query('SELECT * FROM pubchem_compounds WHERE cid = $1', [parseInt(cid, 10)]);
  if (target.rows.length === 0) {
    return res.status(404).json({ error: 'Compound not found' });
  }

  const t = target.rows[0];
  const { rows } = await pool.query(
    `SELECT *,
      (
        CASE WHEN molecular_weight IS NOT NULL AND $2::real IS NOT NULL
             THEN 1.0 - LEAST(ABS(molecular_weight - $2::real) / GREATEST($2::real, 1), 1.0)
             ELSE 0 END
        + CASE WHEN xlogp IS NOT NULL AND $3::real IS NOT NULL
               THEN 1.0 - LEAST(ABS(xlogp - $3::real) / 10.0, 1.0)
               ELSE 0 END
        + CASE WHEN tpsa IS NOT NULL AND $4::real IS NOT NULL
               THEN 1.0 - LEAST(ABS(tpsa - $4::real) / GREATEST($4::real, 1), 1.0)
               ELSE 0 END
        + CASE WHEN hbond_donor IS NOT NULL AND $5::int IS NOT NULL
               THEN 1.0 - LEAST(ABS(hbond_donor - $5::int)::real / 10.0, 1.0)
               ELSE 0 END
        + CASE WHEN hbond_acceptor IS NOT NULL AND $6::int IS NOT NULL
               THEN 1.0 - LEAST(ABS(hbond_acceptor - $6::int)::real / 15.0, 1.0)
               ELSE 0 END
      ) AS similarity_score
     FROM pubchem_compounds
     WHERE cid != $1
     ORDER BY similarity_score DESC
     LIMIT $7`,
    [parseInt(cid, 10), t.molecular_weight, t.xlogp, t.tpsa, t.hbond_donor, t.hbond_acceptor, lim],
  );

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  return res.status(200).json({
    target: t,
    similar: rows.map((r) => ({
      ...r,
      similarity: r.similarity_score ? Math.round((r.similarity_score / 5) * 100) : 0,
    })),
  });
}

async function handleMigrate(pool, req, res) {
  const secret = req.headers['x-migrate-secret'] || req.query.secret;
  if (secret !== (process.env.MIGRATE_SECRET || 'healthpulse-migrate-2026')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pubchem_compounds (
      cid            INTEGER PRIMARY KEY,
      name           TEXT NOT NULL,
      iupac_name     TEXT,
      molecular_formula TEXT,
      molecular_weight  REAL,
      exact_mass     REAL,
      xlogp          REAL,
      tpsa           REAL,
      complexity     REAL,
      hbond_donor    INTEGER,
      hbond_acceptor INTEGER,
      rotatable_bonds INTEGER,
      heavy_atom_count INTEGER,
      charge         INTEGER DEFAULT 0,
      canonical_smiles TEXT,
      isomeric_smiles  TEXT,
      inchi          TEXT,
      inchikey       TEXT,
      drug_likeness  BOOLEAN DEFAULT FALSE,
      synonyms       TEXT[],
      image_url      TEXT,
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      updated_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pc_name ON pubchem_compounds USING gin(to_tsvector('english', name))`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pc_formula ON pubchem_compounds(molecular_formula)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pc_druglike ON pubchem_compounds(drug_likeness)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pc_weight ON pubchem_compounds(molecular_weight)`);

  return res.status(200).json({ success: true, message: 'pubchem_compounds table created' });
}

async function handleEtl(pool, query, req, res) {
  const secret = req.headers['x-migrate-secret'] || query.secret;
  if (secret !== (process.env.MIGRATE_SECRET || 'healthpulse-migrate-2026')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const batchStart = parseInt(query.offset || '0', 10);
  const batchSize = Math.min(parseInt(query.limit || '25', 10), 50);
  const drugs = DRUG_NAMES.slice(batchStart, batchStart + batchSize);

  if (drugs.length === 0) {
    return res.status(200).json({ message: 'No more drugs to process', total: DRUG_NAMES.length });
  }

  const results = { loaded: 0, skipped: 0, failed: [], batch: `${batchStart}-${batchStart + drugs.length}` };

  for (const drug of drugs) {
    try {
      const row = await fetchCompound(drug);
      if (!row) {
        results.skipped++;
        results.failed.push(drug);
        continue;
      }

      await pool.query(
        `INSERT INTO pubchem_compounds (
          cid, name, iupac_name, molecular_formula, molecular_weight, exact_mass,
          xlogp, tpsa, complexity, hbond_donor, hbond_acceptor, rotatable_bonds,
          heavy_atom_count, charge, canonical_smiles, isomeric_smiles, inchi, inchikey,
          drug_likeness, synonyms, image_url, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW())
        ON CONFLICT (cid) DO UPDATE SET
          name=EXCLUDED.name, molecular_weight=EXCLUDED.molecular_weight, xlogp=EXCLUDED.xlogp,
          tpsa=EXCLUDED.tpsa, complexity=EXCLUDED.complexity, drug_likeness=EXCLUDED.drug_likeness,
          synonyms=EXCLUDED.synonyms, updated_at=NOW()`,
        [
          row.cid, row.name, row.iupac_name, row.molecular_formula, row.molecular_weight, row.exact_mass,
          row.xlogp, row.tpsa, row.complexity, row.hbond_donor, row.hbond_acceptor, row.rotatable_bonds,
          row.heavy_atom_count, row.charge, row.canonical_smiles, row.isomeric_smiles, row.inchi, row.inchikey,
          row.drug_likeness, row.synonyms, row.image_url,
        ],
      );
      results.loaded++;
    } catch (err) {
      results.failed.push(`${drug}: ${err.message}`);
    }

    await new Promise((ok) => setTimeout(ok, 300));
  }

  return res.status(200).json({
    ...results,
    total: DRUG_NAMES.length,
    nextOffset: batchStart + drugs.length,
    done: batchStart + drugs.length >= DRUG_NAMES.length,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const [action] = normalizeSlug(req.query.slug);
  const pool = getPool();

  try {
    if (action === 'search' && req.method === 'GET') return await handleSearch(pool, req.query, res);
    if (action === 'similar' && req.method === 'GET') return await handleSimilar(pool, req.query, res);
    if (action === 'migrate' && req.method === 'POST') return await handleMigrate(pool, req, res);
    if (action === 'etl' && req.method === 'POST') return await handleEtl(pool, req.query, req, res);

    return res.status(404).json({ error: 'Unknown pubchem route', available: ['search', 'similar', 'etl', 'migrate'] });
  } catch (err) {
    console.error('[pubchem]', err.message);
    return res.status(500).json({ error: err.message || 'Failed to process PubChem request' });
  }
}
