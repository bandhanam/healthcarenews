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
      if (i < retries) await new Promise(ok => setTimeout(ok, 1500));
    } catch {
      if (i < retries) await new Promise(ok => setTimeout(ok, 2000));
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

  await new Promise(ok => setTimeout(ok, 250));

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const secret = req.headers['x-migrate-secret'] || req.query.secret;
  if (secret !== (process.env.MIGRATE_SECRET || 'healthpulse-migrate-2026')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const batchStart = parseInt(req.query.offset || '0', 10);
  const batchSize = Math.min(parseInt(req.query.limit || '25', 10), 50);
  const drugs = DRUG_NAMES.slice(batchStart, batchStart + batchSize);

  if (drugs.length === 0) {
    return res.status(200).json({ message: 'No more drugs to process', total: DRUG_NAMES.length });
  }

  const pool = getPool();
  const results = { loaded: 0, skipped: 0, failed: [], batch: `${batchStart}-${batchStart + drugs.length}` };

  for (const drug of drugs) {
    try {
      const row = await fetchCompound(drug);
      if (!row) { results.skipped++; results.failed.push(drug); continue; }

      await pool.query(`
        INSERT INTO pubchem_compounds (
          cid, name, iupac_name, molecular_formula, molecular_weight, exact_mass,
          xlogp, tpsa, complexity, hbond_donor, hbond_acceptor, rotatable_bonds,
          heavy_atom_count, charge, canonical_smiles, isomeric_smiles, inchi, inchikey,
          drug_likeness, synonyms, image_url, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW())
        ON CONFLICT (cid) DO UPDATE SET
          name=EXCLUDED.name, molecular_weight=EXCLUDED.molecular_weight, xlogp=EXCLUDED.xlogp,
          tpsa=EXCLUDED.tpsa, complexity=EXCLUDED.complexity, drug_likeness=EXCLUDED.drug_likeness,
          synonyms=EXCLUDED.synonyms, updated_at=NOW()
      `, [
        row.cid, row.name, row.iupac_name, row.molecular_formula, row.molecular_weight, row.exact_mass,
        row.xlogp, row.tpsa, row.complexity, row.hbond_donor, row.hbond_acceptor, row.rotatable_bonds,
        row.heavy_atom_count, row.charge, row.canonical_smiles, row.isomeric_smiles, row.inchi, row.inchikey,
        row.drug_likeness, row.synonyms, row.image_url,
      ]);
      results.loaded++;
    } catch (err) {
      results.failed.push(`${drug}: ${err.message}`);
    }

    await new Promise(ok => setTimeout(ok, 300));
  }

  return res.status(200).json({
    ...results,
    total: DRUG_NAMES.length,
    nextOffset: batchStart + drugs.length,
    done: batchStart + drugs.length >= DRUG_NAMES.length,
  });
}
