import pg from 'pg';

const { Pool } = pg;

const BATCH_SIZE = 500;
const SKIP_IF_SYNCED_WITHIN_MS = 60 * 60 * 1000; // 1 hour
const FDA_PAGE_SIZE = 1000;
const FDA_BASE = 'https://api.fda.gov/drug/drugsfda.json';
const EMA_MEDICINES_URL =
  'https://www.ema.europa.eu/en/documents/report/medicines-output-medicines_json-report_en.json';

function getPool() {
  const certContent = process.env.PGSSLROOTCERT_CONTENT;
  const ssl =
    certContent && certContent.trim()
      ? { rejectUnauthorized: true, ca: certContent.trim() }
      : { rejectUnauthorized: false };

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

// ---------------------------------------------------------------------------
// DDL
// ---------------------------------------------------------------------------

const DDL = `
CREATE TABLE IF NOT EXISTS drug_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source VARCHAR(10) NOT NULL,
  source_id VARCHAR(200) NOT NULL,
  drug_name VARCHAR(500) NOT NULL,
  generic_name VARCHAR(500),
  active_substance VARCHAR(500),
  manufacturer VARCHAR(500),
  approval_date DATE,
  status VARCHAR(100),
  therapeutic_area VARCHAR(500),
  indication TEXT,
  route VARCHAR(200),
  dosage_form VARCHAR(200),
  application_type VARCHAR(100),
  extra_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source, source_id)
);

CREATE TABLE IF NOT EXISTS sync_meta (
  source VARCHAR(10) PRIMARY KEY,
  last_sync_at TIMESTAMPTZ,
  record_count INT
);

CREATE INDEX IF NOT EXISTS idx_da_source ON drug_approvals(source);
CREATE INDEX IF NOT EXISTS idx_da_drug_name ON drug_approvals(drug_name);
CREATE INDEX IF NOT EXISTS idx_da_approval_date ON drug_approvals(approval_date);
CREATE INDEX IF NOT EXISTS idx_da_therapeutic_area ON drug_approvals(therapeutic_area);
`;

// ---------------------------------------------------------------------------
// Batch UPSERT helper
// ---------------------------------------------------------------------------

async function batchUpsert(pool, records) {
  if (!records.length) return 0;
  let total = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const cols = [
      'source',
      'source_id',
      'drug_name',
      'generic_name',
      'active_substance',
      'manufacturer',
      'approval_date',
      'status',
      'therapeutic_area',
      'indication',
      'route',
      'dosage_form',
      'application_type',
      'extra_data',
    ];
    const colCount = cols.length;
    const values = [];
    const placeholders = [];

    batch.forEach((r, idx) => {
      const off = idx * colCount;
      const ph = cols.map((_, ci) => `$${off + ci + 1}`);
      placeholders.push(`(${ph.join(',')})`);
      values.push(
        r.source,
        r.source_id,
        r.drug_name || 'Unknown',
        r.generic_name || null,
        r.active_substance || null,
        r.manufacturer || null,
        r.approval_date || null,
        r.status || null,
        r.therapeutic_area || null,
        r.indication || null,
        r.route || null,
        r.dosage_form || null,
        r.application_type || null,
        r.extra_data ? JSON.stringify(r.extra_data) : null,
      );
    });

    const sql = `
      INSERT INTO drug_approvals (${cols.join(',')})
      VALUES ${placeholders.join(',')}
      ON CONFLICT (source, source_id) DO UPDATE SET
        drug_name = EXCLUDED.drug_name,
        generic_name = EXCLUDED.generic_name,
        active_substance = EXCLUDED.active_substance,
        manufacturer = EXCLUDED.manufacturer,
        approval_date = EXCLUDED.approval_date,
        status = EXCLUDED.status,
        therapeutic_area = EXCLUDED.therapeutic_area,
        indication = EXCLUDED.indication,
        route = EXCLUDED.route,
        dosage_form = EXCLUDED.dosage_form,
        application_type = EXCLUDED.application_type,
        extra_data = EXCLUDED.extra_data,
        updated_at = now()
    `;

    await pool.query(sql, values);
    total += batch.length;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Smart skip check
// ---------------------------------------------------------------------------

async function shouldSkip(pool, source) {
  try {
    const { rows } = await pool.query(
      'SELECT last_sync_at FROM sync_meta WHERE source = $1',
      [source],
    );
    if (rows.length && rows[0].last_sync_at) {
      const elapsed = Date.now() - new Date(rows[0].last_sync_at).getTime();
      return elapsed < SKIP_IF_SYNCED_WITHIN_MS;
    }
  } catch {
    /* first run, table may be empty */
  }
  return false;
}

async function updateSyncMeta(pool, source, count) {
  await pool.query(
    `INSERT INTO sync_meta (source, last_sync_at, record_count)
     VALUES ($1, now(), $2)
     ON CONFLICT (source) DO UPDATE SET last_sync_at = now(), record_count = $2`,
    [source, count],
  );
}

// ---------------------------------------------------------------------------
// FDA sync
// ---------------------------------------------------------------------------

function extractFdaApprovalDate(submissions) {
  if (!submissions) return null;
  const orig = submissions.find(
    (s) => s.submission_type === 'ORIG' && s.submission_status === 'AP',
  );
  if (orig && orig.submission_status_date) {
    const d = orig.submission_status_date;
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  }
  return null;
}

function fdaAppType(appNum) {
  if (!appNum) return null;
  if (appNum.startsWith('NDA')) return 'NDA (New Drug)';
  if (appNum.startsWith('ANDA')) return 'ANDA (Generic)';
  if (appNum.startsWith('BLA')) return 'BLA (Biologic)';
  return appNum.slice(0, 3);
}

function parseFdaRecord(r) {
  const o = r.openfda || {};
  const p = (r.products && r.products[0]) || {};
  return {
    source: 'FDA',
    source_id: r.application_number,
    drug_name: (o.brand_name && o.brand_name[0]) || p.brand_name || r.application_number,
    generic_name: o.generic_name ? o.generic_name[0] : null,
    active_substance: o.substance_name ? o.substance_name.join(', ') : null,
    manufacturer: (o.manufacturer_name && o.manufacturer_name[0]) || r.sponsor_name || null,
    approval_date: extractFdaApprovalDate(r.submissions),
    status: p.marketing_status || null,
    therapeutic_area: o.pharm_class_epc ? o.pharm_class_epc[0] : null,
    indication: null,
    route: (o.route && o.route[0]) || p.route || null,
    dosage_form: p.dosage_form || null,
    application_type: fdaAppType(r.application_number),
    extra_data: {
      product_type: o.product_type ? o.product_type[0] : null,
      rxcui: o.rxcui || null,
      ndc: o.product_ndc || null,
    },
  };
}

async function syncFda(pool) {
  if (await shouldSkip(pool, 'FDA')) {
    console.log('[FDA] Synced recently, skipping.');
    return;
  }

  console.log('[FDA] Starting sync from openFDA...');
  const firstRes = await fetch(`${FDA_BASE}?limit=1`);
  const firstJson = await firstRes.json();
  const total = firstJson.meta.results.total;
  console.log(`[FDA] Total records: ${total}`);

  let allRecords = [];
  for (let skip = 0; skip < total; skip += FDA_PAGE_SIZE) {
    const url = `${FDA_BASE}?limit=${FDA_PAGE_SIZE}&skip=${skip}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[FDA] Page skip=${skip} returned ${res.status}, stopping.`);
        break;
      }
      const json = await res.json();
      const parsed = (json.results || []).map(parseFdaRecord);
      allRecords.push(...parsed);
      process.stdout.write(`\r[FDA] Fetched ${allRecords.length} / ${total}`);
    } catch (err) {
      console.warn(`\n[FDA] Error fetching skip=${skip}: ${err.message}`);
      break;
    }
    // small delay to be polite to the API
    if (skip + FDA_PAGE_SIZE < total) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  console.log(`\n[FDA] Upserting ${allRecords.length} records...`);
  const count = await batchUpsert(pool, allRecords);
  await updateSyncMeta(pool, 'FDA', count);
  console.log(`[FDA] Done. Upserted ${count} records.`);
}

// ---------------------------------------------------------------------------
// EMA sync
// ---------------------------------------------------------------------------

function parseEmaRecord(r) {
  let approvalDate = null;
  if (r.european_commission_decision_date) {
    const raw = r.european_commission_decision_date;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      approvalDate = d.toISOString().slice(0, 10);
    }
  }

  const types = [];
  if (r.generic === 'Yes' || r.generic === 'yes') types.push('Generic');
  if (r.biosimilar === 'Yes' || r.biosimilar === 'yes') types.push('Biosimilar');
  if (r.orphan === 'Yes' || r.orphan === 'yes') types.push('Orphan');
  if (r.advanced_therapy === 'Yes' || r.advanced_therapy === 'yes') types.push('Advanced Therapy');
  if (r.prime === 'Yes' || r.prime === 'yes') types.push('PRIME');

  return {
    source: 'EMA',
    source_id: r.ema_product_number || r.medicine_url || r.name_of_medicine,
    drug_name: r.name_of_medicine || 'Unknown',
    generic_name: r.international_non_proprietary_name_common_name || null,
    active_substance: r.active_substance || null,
    manufacturer: r.marketing_authorisation_developer_applicant_holder || null,
    approval_date: approvalDate,
    status: r.medicine_status || null,
    therapeutic_area: r.therapeutic_area_mesh || null,
    indication: r.therapeutic_indication || null,
    route: null,
    dosage_form: null,
    application_type: types.length ? types.join(', ') : 'Standard',
    extra_data: {
      atc_code: r.atc_code_human || null,
      pharmacotherapeutic_group: r.pharmacotherapeutic_group_human || null,
      url: r.medicine_url || null,
    },
  };
}

async function syncEma(pool) {
  if (await shouldSkip(pool, 'EMA')) {
    console.log('[EMA] Synced recently, skipping.');
    return;
  }

  console.log('[EMA] Downloading medicines JSON...');
  try {
    const res = await fetch(EMA_MEDICINES_URL, {
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      console.warn(`[EMA] HTTP ${res.status}, skipping EMA sync.`);
      return;
    }
    const data = await res.json();

    const medicines = Array.isArray(data) ? data : data.data || data.results || [];
    if (!medicines.length) {
      console.warn('[EMA] No medicines found in JSON response.');
      return;
    }

    const humanMeds = medicines.filter(
      (m) => !m.category || m.category === 'human' || m.category === 'Human',
    );
    console.log(`[EMA] Found ${humanMeds.length} human medicines.`);

    const records = humanMeds.map(parseEmaRecord);
    const count = await batchUpsert(pool, records);
    await updateSyncMeta(pool, 'EMA', count);
    console.log(`[EMA] Done. Upserted ${count} records.`);
  } catch (err) {
    console.error(`[EMA] Sync failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// India CDSCO curated data
// ---------------------------------------------------------------------------

const CDSCO_DATA = [
  { id:'CDSCO-001', name:'Covaxin (BBV152)', generic:'Inactivated SARS-CoV-2', substance:'Whole-Virion Inactivated SARS-CoV-2', mfr:'Bharat Biotech', date:'2021-01-03', area:'Vaccines', indication:'COVID-19 prevention', type:'Vaccine' },
  { id:'CDSCO-002', name:'Covishield (ChAdOx1)', generic:'Adenovirus Vector COVID-19', substance:'ChAdOx1-S recombinant', mfr:'Serum Institute of India', date:'2021-01-03', area:'Vaccines', indication:'COVID-19 prevention', type:'Vaccine' },
  { id:'CDSCO-003', name:'Sputnik V', generic:'Adenovirus Vector COVID-19', substance:'rAd26-S + rAd5-S', mfr:'Dr. Reddy\'s Laboratories', date:'2021-04-13', area:'Vaccines', indication:'COVID-19 prevention', type:'Vaccine' },
  { id:'CDSCO-004', name:'ZyCoV-D', generic:'DNA Plasmid COVID-19', substance:'DNA plasmid SARS-CoV-2 spike', mfr:'Zydus Cadila', date:'2021-08-20', area:'Vaccines', indication:'COVID-19 prevention (needle-free)', type:'Vaccine' },
  { id:'CDSCO-005', name:'Corbevax', generic:'Protein Subunit COVID-19', substance:'RBD protein SARS-CoV-2', mfr:'Biological E', date:'2021-12-28', area:'Vaccines', indication:'COVID-19 prevention', type:'Vaccine' },
  { id:'CDSCO-006', name:'Molnupiravir', generic:'Molnupiravir', substance:'Molnupiravir', mfr:'Merck / Indian generics', date:'2021-12-28', area:'Antivirals', indication:'COVID-19 treatment (mild to moderate)', type:'Antiviral' },
  { id:'CDSCO-007', name:'Remdesivir', generic:'Remdesivir', substance:'Remdesivir', mfr:'Hetero / Cipla / Mylan', date:'2020-06-01', area:'Antivirals', indication:'COVID-19 treatment (hospitalized)', type:'Antiviral' },
  { id:'CDSCO-008', name:'Favipiravir (Fabiflu)', generic:'Favipiravir', substance:'Favipiravir', mfr:'Glenmark Pharmaceuticals', date:'2020-06-20', area:'Antivirals', indication:'COVID-19 treatment (mild to moderate)', type:'Antiviral' },
  { id:'CDSCO-009', name:'2-DG (2-Deoxy-D-Glucose)', generic:'2-Deoxy-D-Glucose', substance:'2-DG', mfr:'DRDO / Dr. Reddy\'s', date:'2021-05-08', area:'Antivirals', indication:'COVID-19 adjunct therapy', type:'Antiviral' },
  { id:'CDSCO-010', name:'Baricitinib', generic:'Baricitinib', substance:'Baricitinib', mfr:'Eli Lilly / MSN Labs', date:'2021-05-01', area:'Immunology', indication:'COVID-19 (hospitalized, on oxygen)', type:'Immunomodulator' },
  { id:'CDSCO-011', name:'Tocilizumab', generic:'Tocilizumab', substance:'Tocilizumab', mfr:'Roche / Cipla', date:'2021-06-24', area:'Immunology', indication:'COVID-19 cytokine storm', type:'Biologic' },
  { id:'CDSCO-012', name:'Itolizumab', generic:'Itolizumab', substance:'Itolizumab', mfr:'Biocon', date:'2020-07-11', area:'Immunology', indication:'COVID-19 cytokine release syndrome', type:'Biologic' },
  { id:'CDSCO-013', name:'Paxlovid (Nirmatrelvir/Ritonavir)', generic:'Nirmatrelvir + Ritonavir', substance:'Nirmatrelvir, Ritonavir', mfr:'Pfizer', date:'2022-04-25', area:'Antivirals', indication:'COVID-19 treatment (high-risk adults)', type:'Antiviral' },
  { id:'CDSCO-014', name:'iNCOVACC (BBV154)', generic:'Intranasal COVID-19', substance:'Adenovirus vectored intranasal', mfr:'Bharat Biotech', date:'2022-11-29', area:'Vaccines', indication:'COVID-19 booster (intranasal)', type:'Vaccine' },
  { id:'CDSCO-015', name:'Metformin', generic:'Metformin HCl', substance:'Metformin Hydrochloride', mfr:'Multiple Indian generic', date:'1979-01-01', area:'Diabetes', indication:'Type 2 diabetes mellitus', type:'Oral Antidiabetic' },
  { id:'CDSCO-016', name:'Glimepiride', generic:'Glimepiride', substance:'Glimepiride', mfr:'Sanofi / Indian generics', date:'2000-06-15', area:'Diabetes', indication:'Type 2 diabetes mellitus', type:'Oral Antidiabetic' },
  { id:'CDSCO-017', name:'Sitagliptin', generic:'Sitagliptin Phosphate', substance:'Sitagliptin Phosphate', mfr:'MSD / Sun Pharma', date:'2007-11-01', area:'Diabetes', indication:'Type 2 diabetes mellitus', type:'DPP-4 Inhibitor' },
  { id:'CDSCO-018', name:'Empagliflozin', generic:'Empagliflozin', substance:'Empagliflozin', mfr:'Boehringer Ingelheim / Lupin', date:'2015-06-01', area:'Diabetes', indication:'Type 2 diabetes + cardiovascular risk', type:'SGLT2 Inhibitor' },
  { id:'CDSCO-019', name:'Dapagliflozin', generic:'Dapagliflozin', substance:'Dapagliflozin', mfr:'AstraZeneca / Indian generics', date:'2015-01-01', area:'Diabetes', indication:'Type 2 diabetes, heart failure', type:'SGLT2 Inhibitor' },
  { id:'CDSCO-020', name:'Semaglutide (Ozempic)', generic:'Semaglutide', substance:'Semaglutide', mfr:'Novo Nordisk', date:'2022-05-01', area:'Diabetes', indication:'Type 2 diabetes mellitus', type:'GLP-1 Receptor Agonist' },
  { id:'CDSCO-021', name:'Insulin Glargine (Basalog)', generic:'Insulin Glargine', substance:'Insulin Glargine', mfr:'Biocon', date:'2009-08-01', area:'Diabetes', indication:'Diabetes mellitus (Types 1 & 2)', type:'Biosimilar Insulin' },
  { id:'CDSCO-022', name:'Teneligliptin', generic:'Teneligliptin', substance:'Teneligliptin Hydrobromide', mfr:'Glenmark / Zydus', date:'2015-09-01', area:'Diabetes', indication:'Type 2 diabetes mellitus', type:'DPP-4 Inhibitor' },
  { id:'CDSCO-023', name:'Vildagliptin', generic:'Vildagliptin', substance:'Vildagliptin', mfr:'Novartis / Indian generics', date:'2008-04-01', area:'Diabetes', indication:'Type 2 diabetes mellitus', type:'DPP-4 Inhibitor' },
  { id:'CDSCO-024', name:'Linagliptin', generic:'Linagliptin', substance:'Linagliptin', mfr:'Boehringer Ingelheim', date:'2012-06-01', area:'Diabetes', indication:'Type 2 diabetes mellitus', type:'DPP-4 Inhibitor' },
  { id:'CDSCO-025', name:'Atorvastatin', generic:'Atorvastatin Calcium', substance:'Atorvastatin Calcium', mfr:'Ranbaxy / Multiple', date:'1998-01-01', area:'Cardiovascular', indication:'Hyperlipidemia, atherosclerosis prevention', type:'Statin' },
  { id:'CDSCO-026', name:'Rosuvastatin', generic:'Rosuvastatin Calcium', substance:'Rosuvastatin Calcium', mfr:'AstraZeneca / Indian generics', date:'2003-01-01', area:'Cardiovascular', indication:'Dyslipidemia, cardiovascular prevention', type:'Statin' },
  { id:'CDSCO-027', name:'Telmisartan', generic:'Telmisartan', substance:'Telmisartan', mfr:'Glenmark / Cipla', date:'2001-01-01', area:'Cardiovascular', indication:'Hypertension, cardiovascular risk', type:'ARB' },
  { id:'CDSCO-028', name:'Amlodipine', generic:'Amlodipine Besylate', substance:'Amlodipine Besylate', mfr:'Pfizer / Indian generics', date:'1992-01-01', area:'Cardiovascular', indication:'Hypertension, angina', type:'Calcium Channel Blocker' },
  { id:'CDSCO-029', name:'Sacubitril/Valsartan (Entresto)', generic:'Sacubitril + Valsartan', substance:'Sacubitril, Valsartan', mfr:'Novartis', date:'2016-11-01', area:'Cardiovascular', indication:'Heart failure with reduced ejection fraction', type:'ARNI' },
  { id:'CDSCO-030', name:'Rivaroxaban', generic:'Rivaroxaban', substance:'Rivaroxaban', mfr:'Bayer / Indian generics', date:'2012-01-01', area:'Cardiovascular', indication:'DVT/PE, stroke prevention in AF', type:'Anticoagulant' },
  { id:'CDSCO-031', name:'Apixaban', generic:'Apixaban', substance:'Apixaban', mfr:'BMS / Pfizer', date:'2014-01-01', area:'Cardiovascular', indication:'Stroke prevention, DVT/PE', type:'Anticoagulant' },
  { id:'CDSCO-032', name:'Clopidogrel', generic:'Clopidogrel Bisulfate', substance:'Clopidogrel Bisulfate', mfr:'Sanofi / Indian generics', date:'2001-01-01', area:'Cardiovascular', indication:'ACS, stroke prevention', type:'Antiplatelet' },
  { id:'CDSCO-033', name:'Ticagrelor', generic:'Ticagrelor', substance:'Ticagrelor', mfr:'AstraZeneca / Indian generics', date:'2013-01-01', area:'Cardiovascular', indication:'Acute coronary syndrome', type:'Antiplatelet' },
  { id:'CDSCO-034', name:'Imatinib (Glivec)', generic:'Imatinib Mesylate', substance:'Imatinib Mesylate', mfr:'Novartis / Natco / Cipla', date:'2003-01-01', area:'Oncology', indication:'CML, GIST', type:'Targeted Therapy' },
  { id:'CDSCO-035', name:'Trastuzumab (Hertraz)', generic:'Trastuzumab', substance:'Trastuzumab', mfr:'Mylan / Biocon', date:'2014-01-28', area:'Oncology', indication:'HER2+ breast cancer', type:'Biosimilar' },
  { id:'CDSCO-036', name:'Bevacizumab (Alymsys)', generic:'Bevacizumab', substance:'Bevacizumab', mfr:'Biocon / Mylan', date:'2017-11-22', area:'Oncology', indication:'Colorectal, lung, cervical cancer', type:'Biosimilar' },
  { id:'CDSCO-037', name:'Rituximab (Ristova)', generic:'Rituximab', substance:'Rituximab', mfr:'Biocon / Mylan', date:'2015-09-01', area:'Oncology', indication:'Non-Hodgkin lymphoma, CLL', type:'Biosimilar' },
  { id:'CDSCO-038', name:'Pembrolizumab (Keytruda)', generic:'Pembrolizumab', substance:'Pembrolizumab', mfr:'MSD', date:'2017-06-01', area:'Oncology', indication:'Melanoma, NSCLC, multiple cancers', type:'Immunotherapy' },
  { id:'CDSCO-039', name:'Nivolumab (Opdivo)', generic:'Nivolumab', substance:'Nivolumab', mfr:'BMS', date:'2016-10-01', area:'Oncology', indication:'Melanoma, NSCLC, RCC', type:'Immunotherapy' },
  { id:'CDSCO-040', name:'Osimertinib (Tagrisso)', generic:'Osimertinib', substance:'Osimertinib Mesylate', mfr:'AstraZeneca', date:'2017-03-01', area:'Oncology', indication:'EGFR T790M+ NSCLC', type:'Targeted Therapy' },
  { id:'CDSCO-041', name:'Palbociclib (Ibrance)', generic:'Palbociclib', substance:'Palbociclib', mfr:'Pfizer', date:'2018-02-01', area:'Oncology', indication:'HR+/HER2- metastatic breast cancer', type:'Targeted Therapy' },
  { id:'CDSCO-042', name:'Ribociclib (Kisqali)', generic:'Ribociclib', substance:'Ribociclib', mfr:'Novartis', date:'2019-05-01', area:'Oncology', indication:'HR+/HER2- advanced breast cancer', type:'Targeted Therapy' },
  { id:'CDSCO-043', name:'Lenvatinib', generic:'Lenvatinib', substance:'Lenvatinib Mesylate', mfr:'Eisai / Indian generics', date:'2018-03-01', area:'Oncology', indication:'Thyroid cancer, HCC', type:'Targeted Therapy' },
  { id:'CDSCO-044', name:'Olaparib (Lynparza)', generic:'Olaparib', substance:'Olaparib', mfr:'AstraZeneca', date:'2019-01-01', area:'Oncology', indication:'BRCA-mutated ovarian/breast cancer', type:'Targeted Therapy' },
  { id:'CDSCO-045', name:'Sorafenib (Nexavar)', generic:'Sorafenib', substance:'Sorafenib Tosylate', mfr:'Bayer / Cipla / Natco', date:'2007-03-01', area:'Oncology', indication:'HCC, RCC, thyroid cancer', type:'Targeted Therapy' },
  { id:'CDSCO-046', name:'Dabrafenib + Trametinib', generic:'Dabrafenib + Trametinib', substance:'Dabrafenib Mesylate, Trametinib Dimethyl Sulfoxide', mfr:'Novartis', date:'2019-08-01', area:'Oncology', indication:'BRAF V600+ melanoma, NSCLC', type:'Targeted Therapy' },
  { id:'CDSCO-047', name:'Amoxicillin + Clavulanate', generic:'Amoxicillin/Clavulanic Acid', substance:'Amoxicillin, Clavulanic Acid', mfr:'GSK / Indian generics', date:'1990-01-01', area:'Antibiotics', indication:'Bacterial infections', type:'Antibiotic' },
  { id:'CDSCO-048', name:'Azithromycin', generic:'Azithromycin', substance:'Azithromycin Dihydrate', mfr:'Pfizer / Alembic / Cipla', date:'1996-01-01', area:'Antibiotics', indication:'Respiratory, skin, STD infections', type:'Antibiotic' },
  { id:'CDSCO-049', name:'Levofloxacin', generic:'Levofloxacin', substance:'Levofloxacin Hemihydrate', mfr:'Cipla / Glenmark', date:'1999-01-01', area:'Antibiotics', indication:'RTI, UTI, skin infections', type:'Antibiotic' },
  { id:'CDSCO-050', name:'Meropenem', generic:'Meropenem', substance:'Meropenem Trihydrate', mfr:'AstraZeneca / Indian generics', date:'2001-01-01', area:'Antibiotics', indication:'Severe bacterial infections', type:'Antibiotic' },
  { id:'CDSCO-051', name:'Ceftriaxone', generic:'Ceftriaxone Sodium', substance:'Ceftriaxone Sodium', mfr:'Roche / Indian generics', date:'1995-01-01', area:'Antibiotics', indication:'Severe infections, meningitis', type:'Antibiotic' },
  { id:'CDSCO-052', name:'Linezolid', generic:'Linezolid', substance:'Linezolid', mfr:'Pfizer / Glenmark / Cipla', date:'2002-06-01', area:'Antibiotics', indication:'MRSA, VRE infections', type:'Antibiotic' },
  { id:'CDSCO-053', name:'Colistin', generic:'Colistimethate Sodium', substance:'Colistimethate Sodium', mfr:'Various Indian', date:'2005-01-01', area:'Antibiotics', indication:'MDR Gram-negative infections', type:'Antibiotic' },
  { id:'CDSCO-054', name:'Cefiderocol', generic:'Cefiderocol', substance:'Cefiderocol Sulfate', mfr:'Shionogi', date:'2023-06-01', area:'Antibiotics', indication:'Carbapenem-resistant infections', type:'Antibiotic' },
  { id:'CDSCO-055', name:'Dolutegravir (Tivicay)', generic:'Dolutegravir Sodium', substance:'Dolutegravir Sodium', mfr:'ViiV / Aurobindo / Cipla', date:'2015-01-01', area:'HIV/Antivirals', indication:'HIV-1 infection', type:'Antiretroviral' },
  { id:'CDSCO-056', name:'Tenofovir Alafenamide (TAF)', generic:'Tenofovir Alafenamide', substance:'Tenofovir Alafenamide Fumarate', mfr:'Gilead / Indian generics', date:'2017-01-01', area:'HIV/Antivirals', indication:'HIV-1, Hepatitis B', type:'Antiretroviral' },
  { id:'CDSCO-057', name:'Bictegravir/Emtricitabine/TAF', generic:'Bictegravir + Emtricitabine + TAF', substance:'Bictegravir, Emtricitabine, TAF', mfr:'Gilead / Cipla / Hetero', date:'2019-06-01', area:'HIV/Antivirals', indication:'HIV-1 infection', type:'Antiretroviral' },
  { id:'CDSCO-058', name:'Cabotegravir + Rilpivirine', generic:'Cabotegravir + Rilpivirine', substance:'Cabotegravir, Rilpivirine', mfr:'ViiV Healthcare', date:'2023-03-01', area:'HIV/Antivirals', indication:'HIV-1 (long-acting injectable)', type:'Antiretroviral' },
  { id:'CDSCO-059', name:'Sofosbuvir (Sovaldi)', generic:'Sofosbuvir', substance:'Sofosbuvir', mfr:'Gilead / Natco / Hetero / Cipla', date:'2015-01-01', area:'HIV/Antivirals', indication:'Chronic Hepatitis C', type:'Antiviral' },
  { id:'CDSCO-060', name:'Sofosbuvir + Velpatasvir (Epclusa)', generic:'Sofosbuvir + Velpatasvir', substance:'Sofosbuvir, Velpatasvir', mfr:'Gilead / Indian generics', date:'2017-02-01', area:'HIV/Antivirals', indication:'Chronic Hepatitis C (all genotypes)', type:'Antiviral' },
  { id:'CDSCO-061', name:'Escitalopram', generic:'Escitalopram Oxalate', substance:'Escitalopram Oxalate', mfr:'Lundbeck / Indian generics', date:'2004-01-01', area:'Mental Health', indication:'MDD, Generalized Anxiety Disorder', type:'SSRI' },
  { id:'CDSCO-062', name:'Sertraline', generic:'Sertraline HCl', substance:'Sertraline Hydrochloride', mfr:'Pfizer / Indian generics', date:'1999-01-01', area:'Mental Health', indication:'Depression, OCD, PTSD, panic disorder', type:'SSRI' },
  { id:'CDSCO-063', name:'Olanzapine', generic:'Olanzapine', substance:'Olanzapine', mfr:'Eli Lilly / Indian generics', date:'2000-01-01', area:'Mental Health', indication:'Schizophrenia, bipolar disorder', type:'Antipsychotic' },
  { id:'CDSCO-064', name:'Aripiprazole', generic:'Aripiprazole', substance:'Aripiprazole', mfr:'Otsuka / Indian generics', date:'2006-01-01', area:'Mental Health', indication:'Schizophrenia, bipolar, MDD adjunct', type:'Antipsychotic' },
  { id:'CDSCO-065', name:'Vortioxetine (Brintellix)', generic:'Vortioxetine', substance:'Vortioxetine Hydrobromide', mfr:'Lundbeck / Indian generics', date:'2018-01-01', area:'Mental Health', indication:'Major Depressive Disorder', type:'Antidepressant' },
  { id:'CDSCO-066', name:'Esketamine (Spravato)', generic:'Esketamine', substance:'Esketamine Hydrochloride', mfr:'Janssen', date:'2023-09-01', area:'Mental Health', indication:'Treatment-resistant depression', type:'Antidepressant' },
  { id:'CDSCO-067', name:'Montelukast', generic:'Montelukast Sodium', substance:'Montelukast Sodium', mfr:'MSD / Indian generics', date:'2001-01-01', area:'Respiratory', indication:'Asthma, allergic rhinitis', type:'LTRA' },
  { id:'CDSCO-068', name:'Budesonide + Formoterol', generic:'Budesonide + Formoterol', substance:'Budesonide, Formoterol Fumarate', mfr:'AstraZeneca / Cipla', date:'2003-01-01', area:'Respiratory', indication:'Asthma, COPD', type:'ICS/LABA' },
  { id:'CDSCO-069', name:'Tiotropium (Spiriva)', generic:'Tiotropium Bromide', substance:'Tiotropium Bromide', mfr:'Boehringer Ingelheim / Cipla', date:'2005-01-01', area:'Respiratory', indication:'COPD maintenance', type:'LAMA' },
  { id:'CDSCO-070', name:'Pirfenidone', generic:'Pirfenidone', substance:'Pirfenidone', mfr:'Cipla / Sun Pharma', date:'2016-01-01', area:'Respiratory', indication:'Idiopathic Pulmonary Fibrosis', type:'Antifibrotic' },
  { id:'CDSCO-071', name:'Nintedanib (Ofev)', generic:'Nintedanib', substance:'Nintedanib Esylate', mfr:'Boehringer Ingelheim', date:'2017-01-01', area:'Respiratory', indication:'IPF, SSc-ILD', type:'Antifibrotic' },
  { id:'CDSCO-072', name:'Dupilumab (Dupixent)', generic:'Dupilumab', substance:'Dupilumab', mfr:'Sanofi / Regeneron', date:'2022-03-01', area:'Respiratory', indication:'Moderate-to-severe asthma, atopic dermatitis', type:'Biologic' },
  { id:'CDSCO-073', name:'Pantoprazole', generic:'Pantoprazole Sodium', substance:'Pantoprazole Sodium Sesquihydrate', mfr:'Indian generics', date:'1997-01-01', area:'Gastrointestinal', indication:'GERD, peptic ulcer', type:'PPI' },
  { id:'CDSCO-074', name:'Rabeprazole', generic:'Rabeprazole Sodium', substance:'Rabeprazole Sodium', mfr:'Eisai / Indian generics', date:'2001-01-01', area:'Gastrointestinal', indication:'GERD, H. pylori eradication', type:'PPI' },
  { id:'CDSCO-075', name:'Ondansetron', generic:'Ondansetron HCl', substance:'Ondansetron Hydrochloride', mfr:'Indian generics', date:'1995-01-01', area:'Gastrointestinal', indication:'Nausea/vomiting (chemo, post-op)', type:'Antiemetic' },
  { id:'CDSCO-076', name:'Rifagut (Rifaximin)', generic:'Rifaximin', substance:'Rifaximin', mfr:'Sun Pharma / Abbott', date:'2006-01-01', area:'Gastrointestinal', indication:'IBS-D, hepatic encephalopathy', type:'Antibiotic (GI)' },
  { id:'CDSCO-077', name:'Adalimumab (Exemptia)', generic:'Adalimumab', substance:'Adalimumab', mfr:'Zydus Cadila', date:'2014-12-02', area:'Immunology', indication:'RA, psoriasis, Crohn\'s, UC', type:'Biosimilar' },
  { id:'CDSCO-078', name:'Infliximab (Infimab)', generic:'Infliximab', substance:'Infliximab', mfr:'Epirus Biopharmaceuticals', date:'2014-10-01', area:'Immunology', indication:'RA, Crohn\'s, UC, psoriasis', type:'Biosimilar' },
  { id:'CDSCO-079', name:'Secukinumab (Cosentyx)', generic:'Secukinumab', substance:'Secukinumab', mfr:'Novartis', date:'2016-09-01', area:'Immunology', indication:'Psoriasis, ankylosing spondylitis', type:'Biologic' },
  { id:'CDSCO-080', name:'Tofacitinib (Xeljanz)', generic:'Tofacitinib Citrate', substance:'Tofacitinib Citrate', mfr:'Pfizer', date:'2016-03-01', area:'Immunology', indication:'Rheumatoid arthritis, UC', type:'JAK Inhibitor' },
  { id:'CDSCO-081', name:'Upadacitinib (Rinvoq)', generic:'Upadacitinib', substance:'Upadacitinib', mfr:'AbbVie', date:'2021-10-01', area:'Immunology', indication:'RA, atopic dermatitis, UC', type:'JAK Inhibitor' },
  { id:'CDSCO-082', name:'Levothyroxine', generic:'Levothyroxine Sodium', substance:'Levothyroxine Sodium', mfr:'Abbott / Indian generics', date:'1990-01-01', area:'Endocrine', indication:'Hypothyroidism', type:'Thyroid Hormone' },
  { id:'CDSCO-083', name:'Alendronate', generic:'Alendronate Sodium', substance:'Alendronate Sodium', mfr:'MSD / Indian generics', date:'2000-01-01', area:'Endocrine', indication:'Osteoporosis', type:'Bisphosphonate' },
  { id:'CDSCO-084', name:'Denosumab (Prolia)', generic:'Denosumab', substance:'Denosumab', mfr:'Amgen', date:'2012-01-01', area:'Endocrine', indication:'Osteoporosis, bone metastases', type:'Biologic' },
  { id:'CDSCO-085', name:'Teriparatide', generic:'Teriparatide', substance:'Teriparatide (rDNA origin)', mfr:'Eli Lilly / Indian generics', date:'2008-01-01', area:'Endocrine', indication:'Severe osteoporosis', type:'Bone Anabolic' },
  { id:'CDSCO-086', name:'Erythropoietin (Wepox)', generic:'Epoetin Alfa', substance:'Recombinant Human Erythropoietin', mfr:'Wockhardt', date:'2005-01-01', area:'Blood Disorders', indication:'Anemia (CKD, chemotherapy)', type:'Biosimilar' },
  { id:'CDSCO-087', name:'Filgrastim (Grafeel)', generic:'Filgrastim', substance:'Recombinant G-CSF', mfr:'Dr. Reddy\'s', date:'2001-01-01', area:'Blood Disorders', indication:'Neutropenia (chemotherapy)', type:'Biosimilar' },
  { id:'CDSCO-088', name:'Pegfilgrastim', generic:'Pegfilgrastim', substance:'Pegylated Filgrastim', mfr:'Biocon / Dr. Reddy\'s', date:'2010-01-01', area:'Blood Disorders', indication:'Febrile neutropenia prevention', type:'Biosimilar' },
  { id:'CDSCO-089', name:'Emicizumab (Hemlibra)', generic:'Emicizumab', substance:'Emicizumab', mfr:'Roche', date:'2020-05-01', area:'Blood Disorders', indication:'Hemophilia A with inhibitors', type:'Biologic' },
  { id:'CDSCO-090', name:'Ruxolitinib (Jakavi)', generic:'Ruxolitinib', substance:'Ruxolitinib Phosphate', mfr:'Novartis', date:'2015-01-01', area:'Blood Disorders', indication:'Myelofibrosis, polycythemia vera', type:'JAK Inhibitor' },
  { id:'CDSCO-091', name:'Ranibizumab (Razumab)', generic:'Ranibizumab', substance:'Ranibizumab', mfr:'Intas Pharmaceuticals', date:'2015-04-01', area:'Ophthalmology', indication:'Wet AMD, DME', type:'Biosimilar' },
  { id:'CDSCO-092', name:'Aflibercept (Eylea)', generic:'Aflibercept', substance:'Aflibercept', mfr:'Bayer / Regeneron', date:'2015-05-01', area:'Ophthalmology', indication:'Wet AMD, DME, RVO', type:'Biologic' },
  { id:'CDSCO-093', name:'Latanoprost', generic:'Latanoprost', substance:'Latanoprost', mfr:'Pfizer / Sun Pharma', date:'2001-01-01', area:'Ophthalmology', indication:'Glaucoma, ocular hypertension', type:'Prostaglandin Analog' },
  { id:'CDSCO-094', name:'Ivermectin', generic:'Ivermectin', substance:'Ivermectin', mfr:'Indian generics', date:'2000-01-01', area:'Antiparasitic', indication:'Strongyloidiasis, onchocerciasis, scabies', type:'Antiparasitic' },
  { id:'CDSCO-095', name:'Artemether + Lumefantrine', generic:'Artemether/Lumefantrine', substance:'Artemether, Lumefantrine', mfr:'Novartis / Indian generics', date:'2004-01-01', area:'Antiparasitic', indication:'Falciparum malaria', type:'Antimalarial' },
  { id:'CDSCO-096', name:'Artesunate (Injectable)', generic:'Artesunate', substance:'Artesunate', mfr:'Indian generics', date:'2005-01-01', area:'Antiparasitic', indication:'Severe falciparum malaria', type:'Antimalarial' },
  { id:'CDSCO-097', name:'Albendazole', generic:'Albendazole', substance:'Albendazole', mfr:'Indian generics', date:'1990-01-01', area:'Antiparasitic', indication:'Helminth infections', type:'Anthelmintic' },
  { id:'CDSCO-098', name:'Miltefosine', generic:'Miltefosine', substance:'Miltefosine', mfr:'Knight Therapeutics / Gland', date:'2004-01-01', area:'Antiparasitic', indication:'Visceral Leishmaniasis', type:'Antiparasitic' },
  { id:'CDSCO-099', name:'Bedaquiline', generic:'Bedaquiline', substance:'Bedaquiline Fumarate', mfr:'Janssen / Indian generics', date:'2018-01-01', area:'Tuberculosis', indication:'MDR-TB', type:'Anti-TB' },
  { id:'CDSCO-100', name:'Delamanid', generic:'Delamanid', substance:'Delamanid', mfr:'Otsuka / Macleods', date:'2019-01-01', area:'Tuberculosis', indication:'MDR-TB', type:'Anti-TB' },
  { id:'CDSCO-101', name:'Pretomanid', generic:'Pretomanid', substance:'Pretomanid', mfr:'TB Alliance / Macleods', date:'2020-08-01', area:'Tuberculosis', indication:'XDR-TB, treatment-intolerant MDR-TB', type:'Anti-TB' },
  { id:'CDSCO-102', name:'ROTAVAC', generic:'Rotavirus Vaccine', substance:'Rotavirus Vaccine (116E)', mfr:'Bharat Biotech', date:'2014-03-07', area:'Vaccines', indication:'Rotavirus gastroenteritis prevention', type:'Vaccine' },
  { id:'CDSCO-103', name:'ROTAVAC 5D', generic:'Pentavalent Rotavirus Vaccine', substance:'Rotavirus Vaccine (pentavalent)', mfr:'Bharat Biotech', date:'2018-10-01', area:'Vaccines', indication:'Rotavirus gastroenteritis prevention', type:'Vaccine' },
  { id:'CDSCO-104', name:'ROTASIIL', generic:'Bovine Rotavirus Pentavalent', substance:'Bovine-Human Reassortant Rotavirus', mfr:'Serum Institute of India', date:'2018-05-01', area:'Vaccines', indication:'Rotavirus gastroenteritis prevention', type:'Vaccine' },
  { id:'CDSCO-105', name:'Typhoid Conjugate Vaccine (Typbar-TCV)', generic:'Typhoid Vi-TT Conjugate', substance:'Vi Polysaccharide-Tetanus Toxoid Conjugate', mfr:'Bharat Biotech', date:'2013-09-15', area:'Vaccines', indication:'Typhoid fever prevention', type:'Vaccine' },
  { id:'CDSCO-106', name:'Pneumococcal Conjugate Vaccine (PNEUMOSIL)', generic:'PCV10', substance:'Pneumococcal Polysaccharide CRM197', mfr:'Serum Institute of India', date:'2020-07-14', area:'Vaccines', indication:'Pneumococcal disease prevention', type:'Vaccine' },
  { id:'CDSCO-107', name:'Malaria Vaccine (R21/Matrix-M)', generic:'R21/Matrix-M', substance:'R21 antigen, Matrix-M adjuvant', mfr:'Serum Institute of India', date:'2024-07-01', area:'Vaccines', indication:'P. falciparum malaria prevention', type:'Vaccine' },
  { id:'CDSCO-108', name:'Dengue Vaccine (Dengvaxia)', generic:'Dengue Tetravalent Vaccine', substance:'CYD-TDV', mfr:'Sanofi Pasteur', date:'2018-04-01', area:'Vaccines', indication:'Dengue prevention (seropositive)', type:'Vaccine' },
  { id:'CDSCO-109', name:'HPV Vaccine (CERVAVAC)', generic:'Quadrivalent HPV Vaccine', substance:'HPV L1 VLP (Types 6,11,16,18)', mfr:'Serum Institute of India', date:'2022-07-12', area:'Vaccines', indication:'Cervical cancer prevention', type:'Vaccine' },
  { id:'CDSCO-110', name:'Japanese Encephalitis Vaccine (JENVAC)', generic:'JE Vaccine (Inactivated)', substance:'Inactivated JE Virus', mfr:'Bharat Biotech', date:'2013-06-01', area:'Vaccines', indication:'Japanese Encephalitis prevention', type:'Vaccine' },
  { id:'CDSCO-111', name:'Trastuzumab Emtansine (Kadcyla)', generic:'T-DM1', substance:'Trastuzumab Emtansine', mfr:'Roche', date:'2019-02-01', area:'Oncology', indication:'HER2+ metastatic breast cancer', type:'ADC' },
  { id:'CDSCO-112', name:'Bortezomib (BortecAD)', generic:'Bortezomib', substance:'Bortezomib', mfr:'Cadila Healthcare', date:'2012-01-01', area:'Oncology', indication:'Multiple Myeloma', type:'Biosimilar' },
  { id:'CDSCO-113', name:'Lenalidomide', generic:'Lenalidomide', substance:'Lenalidomide', mfr:'Celgene / Natco', date:'2010-01-01', area:'Oncology', indication:'Multiple Myeloma, MDS', type:'Immunomodulatory' },
  { id:'CDSCO-114', name:'Ibrutinib (Imbruvica)', generic:'Ibrutinib', substance:'Ibrutinib', mfr:'Janssen / Pharmacyclics', date:'2016-01-01', area:'Oncology', indication:'CLL, MCL, WM', type:'Targeted Therapy' },
  { id:'CDSCO-115', name:'Venetoclax', generic:'Venetoclax', substance:'Venetoclax', mfr:'AbbVie / Genentech', date:'2020-01-01', area:'Oncology', indication:'CLL, AML', type:'Targeted Therapy' },
  { id:'CDSCO-116', name:'Lorlatinib', generic:'Lorlatinib', substance:'Lorlatinib', mfr:'Pfizer', date:'2022-01-01', area:'Oncology', indication:'ALK+ metastatic NSCLC', type:'Targeted Therapy' },
  { id:'CDSCO-117', name:'Durvalumab (Imfinzi)', generic:'Durvalumab', substance:'Durvalumab', mfr:'AstraZeneca', date:'2019-09-01', area:'Oncology', indication:'Stage III NSCLC, SCLC', type:'Immunotherapy' },
  { id:'CDSCO-118', name:'Atezolizumab (Tecentriq)', generic:'Atezolizumab', substance:'Atezolizumab', mfr:'Roche', date:'2019-05-01', area:'Oncology', indication:'NSCLC, SCLC, TNBC', type:'Immunotherapy' },
  { id:'CDSCO-119', name:'Pertuzumab (Perjeta)', generic:'Pertuzumab', substance:'Pertuzumab', mfr:'Roche', date:'2017-12-01', area:'Oncology', indication:'HER2+ breast cancer (neoadjuvant)', type:'Biologic' },
  { id:'CDSCO-120', name:'Encorafenib + Binimetinib', generic:'Encorafenib/Binimetinib', substance:'Encorafenib, Binimetinib', mfr:'Pfizer', date:'2023-01-01', area:'Oncology', indication:'BRAF V600E+ metastatic CRC', type:'Targeted Therapy' },
  { id:'CDSCO-121', name:'Leuprolide Depot', generic:'Leuprolide Acetate', substance:'Leuprolide Acetate', mfr:'Sun Pharma / Indian generics', date:'2002-01-01', area:'Oncology', indication:'Prostate cancer, endometriosis', type:'Hormonal Therapy' },
  { id:'CDSCO-122', name:'Enzalutamide (Xtandi)', generic:'Enzalutamide', substance:'Enzalutamide', mfr:'Astellas / Pfizer', date:'2015-01-01', area:'Oncology', indication:'Metastatic CRPC', type:'Hormonal Therapy' },
  { id:'CDSCO-123', name:'Abiraterone (Zytiga)', generic:'Abiraterone Acetate', substance:'Abiraterone Acetate', mfr:'Janssen / Indian generics', date:'2013-01-01', area:'Oncology', indication:'Metastatic CRPC', type:'Hormonal Therapy' },
  { id:'CDSCO-124', name:'Everolimus (Afinitor)', generic:'Everolimus', substance:'Everolimus', mfr:'Novartis', date:'2012-01-01', area:'Oncology', indication:'Advanced RCC, breast cancer, PNET', type:'mTOR Inhibitor' },
  { id:'CDSCO-125', name:'Sunitinib (Sutent)', generic:'Sunitinib', substance:'Sunitinib Malate', mfr:'Pfizer', date:'2007-01-01', area:'Oncology', indication:'GIST, advanced RCC', type:'Targeted Therapy' },
  { id:'CDSCO-126', name:'Paracetamol (Calpol)', generic:'Paracetamol', substance:'Paracetamol (Acetaminophen)', mfr:'GSK / Indian generics', date:'1978-01-01', area:'Analgesic', indication:'Pain, fever', type:'Analgesic' },
  { id:'CDSCO-127', name:'Diclofenac', generic:'Diclofenac Sodium', substance:'Diclofenac Sodium', mfr:'Novartis / Indian generics', date:'1985-01-01', area:'Analgesic', indication:'Pain, inflammation, arthritis', type:'NSAID' },
  { id:'CDSCO-128', name:'Etoricoxib (Arcoxia)', generic:'Etoricoxib', substance:'Etoricoxib', mfr:'MSD / Indian generics', date:'2003-01-01', area:'Analgesic', indication:'OA, RA, acute gouty arthritis', type:'COX-2 Inhibitor' },
  { id:'CDSCO-129', name:'Pregabalin', generic:'Pregabalin', substance:'Pregabalin', mfr:'Pfizer / Indian generics', date:'2005-01-01', area:'Neurology', indication:'Neuropathic pain, epilepsy, GAD', type:'Anticonvulsant' },
  { id:'CDSCO-130', name:'Levetiracetam', generic:'Levetiracetam', substance:'Levetiracetam', mfr:'UCB / Indian generics', date:'2004-01-01', area:'Neurology', indication:'Epilepsy (partial, myoclonic, tonic-clonic)', type:'Anticonvulsant' },
  { id:'CDSCO-131', name:'Lacosamide', generic:'Lacosamide', substance:'Lacosamide', mfr:'UCB / Indian generics', date:'2012-01-01', area:'Neurology', indication:'Partial-onset seizures', type:'Anticonvulsant' },
  { id:'CDSCO-132', name:'Erenumab (Aimovig)', generic:'Erenumab', substance:'Erenumab-aooe', mfr:'Novartis / Amgen', date:'2021-08-01', area:'Neurology', indication:'Migraine prevention', type:'Biologic (CGRP)' },
  { id:'CDSCO-133', name:'Fremanezumab (Ajovy)', generic:'Fremanezumab', substance:'Fremanezumab-vfrm', mfr:'Teva / Lundbeck', date:'2022-06-01', area:'Neurology', indication:'Migraine prevention', type:'Biologic (CGRP)' },
  { id:'CDSCO-134', name:'Nusinersen (Spinraza)', generic:'Nusinersen', substance:'Nusinersen', mfr:'Biogen', date:'2021-06-01', area:'Rare Disease', indication:'Spinal Muscular Atrophy (SMA)', type:'Gene Therapy (ASO)' },
  { id:'CDSCO-135', name:'Zolgensma (Onasemnogene)', generic:'Onasemnogene Abeparvovec', substance:'Onasemnogene Abeparvovec', mfr:'Novartis Gene Therapies', date:'2023-05-01', area:'Rare Disease', indication:'SMA Type 1', type:'Gene Therapy' },
  { id:'CDSCO-136', name:'Ivacaftor (Kalydeco)', generic:'Ivacaftor', substance:'Ivacaftor', mfr:'Vertex', date:'2020-01-01', area:'Rare Disease', indication:'Cystic Fibrosis (specific CFTR)', type:'CFTR Modulator' },
  { id:'CDSCO-137', name:'Migalastat (Galafold)', generic:'Migalastat', substance:'Migalastat Hydrochloride', mfr:'Amicus Therapeutics', date:'2022-01-01', area:'Rare Disease', indication:'Fabry Disease', type:'Pharmacological Chaperone' },
  { id:'CDSCO-138', name:'Lumacaftor + Ivacaftor (Orkambi)', generic:'Lumacaftor/Ivacaftor', substance:'Lumacaftor, Ivacaftor', mfr:'Vertex', date:'2021-01-01', area:'Rare Disease', indication:'Cystic Fibrosis (F508del)', type:'CFTR Modulator' },
  { id:'CDSCO-139', name:'Sildenafil', generic:'Sildenafil Citrate', substance:'Sildenafil Citrate', mfr:'Pfizer / Indian generics', date:'2001-01-01', area:'Urology', indication:'ED, Pulmonary Arterial Hypertension', type:'PDE5 Inhibitor' },
  { id:'CDSCO-140', name:'Tadalafil', generic:'Tadalafil', substance:'Tadalafil', mfr:'Eli Lilly / Indian generics', date:'2003-01-01', area:'Urology', indication:'ED, BPH, PAH', type:'PDE5 Inhibitor' },
  { id:'CDSCO-141', name:'Tamsulosin', generic:'Tamsulosin HCl', substance:'Tamsulosin Hydrochloride', mfr:'Boehringer / Indian generics', date:'2001-01-01', area:'Urology', indication:'BPH', type:'Alpha-1 Blocker' },
  { id:'CDSCO-142', name:'Mirabegron', generic:'Mirabegron', substance:'Mirabegron', mfr:'Astellas', date:'2016-01-01', area:'Urology', indication:'Overactive Bladder', type:'Beta-3 Agonist' },
  { id:'CDSCO-143', name:'Cetuximab (Erbitux)', generic:'Cetuximab', substance:'Cetuximab', mfr:'Merck KGaA', date:'2007-06-01', area:'Oncology', indication:'Head & neck, colorectal cancer', type:'Targeted Therapy' },
  { id:'CDSCO-144', name:'Temozolomide', generic:'Temozolomide', substance:'Temozolomide', mfr:'MSD / Sun Pharma', date:'2005-01-01', area:'Oncology', indication:'Glioblastoma, anaplastic astrocytoma', type:'Alkylating Agent' },
  { id:'CDSCO-145', name:'Oxaliplatin', generic:'Oxaliplatin', substance:'Oxaliplatin', mfr:'Sanofi / Indian generics', date:'2004-01-01', area:'Oncology', indication:'Colorectal cancer', type:'Platinum-based' },
  { id:'CDSCO-146', name:'Docetaxel', generic:'Docetaxel', substance:'Docetaxel Trihydrate', mfr:'Sanofi / Indian generics', date:'2001-01-01', area:'Oncology', indication:'Breast, NSCLC, prostate cancer', type:'Taxane' },
  { id:'CDSCO-147', name:'Capecitabine (Xeloda)', generic:'Capecitabine', substance:'Capecitabine', mfr:'Roche / Indian generics', date:'2003-01-01', area:'Oncology', indication:'Colorectal, breast cancer', type:'Antimetabolite' },
  { id:'CDSCO-148', name:'Gefitinib (Iressa)', generic:'Gefitinib', substance:'Gefitinib', mfr:'AstraZeneca / Natco', date:'2006-01-01', area:'Oncology', indication:'EGFR+ NSCLC', type:'Targeted Therapy' },
  { id:'CDSCO-149', name:'Erlotinib (Tarceva)', generic:'Erlotinib', substance:'Erlotinib Hydrochloride', mfr:'Roche / Cipla', date:'2006-01-01', area:'Oncology', indication:'EGFR+ NSCLC, pancreatic cancer', type:'Targeted Therapy' },
  { id:'CDSCO-150', name:'Crizotinib (Xalkori)', generic:'Crizotinib', substance:'Crizotinib', mfr:'Pfizer', date:'2014-01-01', area:'Oncology', indication:'ALK+ NSCLC', type:'Targeted Therapy' },
  { id:'CDSCO-151', name:'Carfilzomib (Kyprolis)', generic:'Carfilzomib', substance:'Carfilzomib', mfr:'Amgen', date:'2018-01-01', area:'Oncology', indication:'Relapsed Multiple Myeloma', type:'Proteasome Inhibitor' },
  { id:'CDSCO-152', name:'Daratumumab (Darzalex)', generic:'Daratumumab', substance:'Daratumumab', mfr:'Janssen', date:'2018-06-01', area:'Oncology', indication:'Multiple Myeloma', type:'Biologic' },
  { id:'CDSCO-153', name:'Polatuzumab Vedotin (Polivy)', generic:'Polatuzumab Vedotin', substance:'Polatuzumab Vedotin-piiq', mfr:'Roche', date:'2022-06-01', area:'Oncology', indication:'Diffuse Large B-Cell Lymphoma', type:'ADC' },
  { id:'CDSCO-154', name:'Zanubrutinib (Brukinsa)', generic:'Zanubrutinib', substance:'Zanubrutinib', mfr:'BeiGene', date:'2023-07-01', area:'Oncology', indication:'CLL/SLL, MCL, WM', type:'BTK Inhibitor' },
  { id:'CDSCO-155', name:'Alpelisib (Piqray)', generic:'Alpelisib', substance:'Alpelisib', mfr:'Novartis', date:'2021-01-01', area:'Oncology', indication:'PIK3CA+ HR+/HER2- breast cancer', type:'Targeted Therapy' },
  { id:'CDSCO-156', name:'Tucatinib (Tukysa)', generic:'Tucatinib', substance:'Tucatinib', mfr:'Seagen', date:'2022-07-01', area:'Oncology', indication:'HER2+ metastatic breast cancer', type:'Targeted Therapy' },
  { id:'CDSCO-157', name:'Sacituzumab Govitecan (Trodelvy)', generic:'Sacituzumab Govitecan', substance:'Sacituzumab Govitecan-hziy', mfr:'Gilead', date:'2023-12-01', area:'Oncology', indication:'TNBC, urothelial cancer', type:'ADC' },
  { id:'CDSCO-158', name:'Larotrectinib (Vitrakvi)', generic:'Larotrectinib', substance:'Larotrectinib Sulfate', mfr:'Bayer', date:'2022-01-01', area:'Oncology', indication:'NTRK fusion-positive solid tumors', type:'Targeted Therapy' },
  { id:'CDSCO-159', name:'Entrectinib (Rozlytrek)', generic:'Entrectinib', substance:'Entrectinib', mfr:'Roche', date:'2022-01-01', area:'Oncology', indication:'NTRK/ROS1+ solid tumors, NSCLC', type:'Targeted Therapy' },
  { id:'CDSCO-160', name:'Tepotinib (Tepmetko)', generic:'Tepotinib', substance:'Tepotinib Hydrochloride', mfr:'Merck KGaA', date:'2023-03-01', area:'Oncology', indication:'MET exon 14 skipping NSCLC', type:'Targeted Therapy' },
  { id:'CDSCO-161', name:'Isavuconazole', generic:'Isavuconazonium Sulfate', substance:'Isavuconazonium Sulfate', mfr:'Astellas / Pfizer', date:'2021-09-01', area:'Antifungal', indication:'Invasive aspergillosis, mucormycosis', type:'Antifungal' },
  { id:'CDSCO-162', name:'Voriconazole', generic:'Voriconazole', substance:'Voriconazole', mfr:'Pfizer / Indian generics', date:'2004-01-01', area:'Antifungal', indication:'Invasive aspergillosis', type:'Antifungal' },
  { id:'CDSCO-163', name:'Amphotericin B Liposomal', generic:'Liposomal Amphotericin B', substance:'Amphotericin B', mfr:'Cipla / Sun Pharma', date:'2002-01-01', area:'Antifungal', indication:'Systemic fungal infections, Kala-azar', type:'Antifungal' },
  { id:'CDSCO-164', name:'Caspofungin', generic:'Caspofungin Acetate', substance:'Caspofungin Acetate', mfr:'MSD / Indian generics', date:'2005-01-01', area:'Antifungal', indication:'Invasive candidiasis, aspergillosis', type:'Echinocandin' },
  { id:'CDSCO-165', name:'Ledipasvir + Sofosbuvir', generic:'Ledipasvir/Sofosbuvir', substance:'Ledipasvir, Sofosbuvir', mfr:'Gilead / Hetero / Mylan', date:'2015-12-01', area:'HIV/Antivirals', indication:'Chronic Hepatitis C (GT 1, 4, 5, 6)', type:'Antiviral' },
  { id:'CDSCO-166', name:'Daclatasvir', generic:'Daclatasvir Dihydrochloride', substance:'Daclatasvir', mfr:'BMS / Hetero / Natco', date:'2015-08-01', area:'HIV/Antivirals', indication:'Chronic Hepatitis C', type:'Antiviral' },
  { id:'CDSCO-167', name:'Glecaprevir + Pibrentasvir', generic:'Glecaprevir/Pibrentasvir', substance:'Glecaprevir, Pibrentasvir', mfr:'AbbVie', date:'2018-10-01', area:'HIV/Antivirals', indication:'Chronic Hepatitis C (all genotypes)', type:'Antiviral' },
  { id:'CDSCO-168', name:'Entecavir', generic:'Entecavir', substance:'Entecavir', mfr:'BMS / Indian generics', date:'2006-01-01', area:'HIV/Antivirals', indication:'Chronic Hepatitis B', type:'Antiviral' },
  { id:'CDSCO-169', name:'Tenofovir Disoproxil', generic:'Tenofovir DF', substance:'Tenofovir Disoproxil Fumarate', mfr:'Cipla / Hetero', date:'2005-01-01', area:'HIV/Antivirals', indication:'HIV-1, Hepatitis B', type:'Antiretroviral' },
  { id:'CDSCO-170', name:'Efavirenz', generic:'Efavirenz', substance:'Efavirenz', mfr:'Cipla / Aurobindo / Hetero', date:'2001-01-01', area:'HIV/Antivirals', indication:'HIV-1 infection', type:'Antiretroviral' },
  { id:'CDSCO-171', name:'Lopinavir + Ritonavir', generic:'Lopinavir/Ritonavir', substance:'Lopinavir, Ritonavir', mfr:'AbbVie / Indian generics', date:'2003-01-01', area:'HIV/Antivirals', indication:'HIV-1 infection', type:'Antiretroviral' },
  { id:'CDSCO-172', name:'Insulin Aspart (NovoRapid)', generic:'Insulin Aspart', substance:'Insulin Aspart', mfr:'Novo Nordisk', date:'2004-01-01', area:'Diabetes', indication:'Diabetes mellitus (Types 1 & 2)', type:'Rapid-acting Insulin' },
  { id:'CDSCO-173', name:'Insulin Degludec (Tresiba)', generic:'Insulin Degludec', substance:'Insulin Degludec', mfr:'Novo Nordisk', date:'2016-01-01', area:'Diabetes', indication:'Diabetes mellitus', type:'Ultra-long Insulin' },
  { id:'CDSCO-174', name:'Dulaglutide (Trulicity)', generic:'Dulaglutide', substance:'Dulaglutide', mfr:'Eli Lilly', date:'2016-06-01', area:'Diabetes', indication:'Type 2 diabetes mellitus', type:'GLP-1 Receptor Agonist' },
  { id:'CDSCO-175', name:'Canagliflozin', generic:'Canagliflozin', substance:'Canagliflozin', mfr:'Janssen / Indian generics', date:'2014-09-01', area:'Diabetes', indication:'Type 2 diabetes, cardiovascular risk', type:'SGLT2 Inhibitor' },
  { id:'CDSCO-176', name:'Liraglutide (Victoza)', generic:'Liraglutide', substance:'Liraglutide', mfr:'Novo Nordisk', date:'2011-01-01', area:'Diabetes', indication:'Type 2 diabetes mellitus', type:'GLP-1 Receptor Agonist' },
  { id:'CDSCO-177', name:'Nebivolol', generic:'Nebivolol', substance:'Nebivolol Hydrochloride', mfr:'Indian generics', date:'2005-01-01', area:'Cardiovascular', indication:'Hypertension', type:'Beta Blocker' },
  { id:'CDSCO-178', name:'Olmesartan', generic:'Olmesartan Medoxomil', substance:'Olmesartan Medoxomil', mfr:'Daiichi-Sankyo / Indian generics', date:'2004-01-01', area:'Cardiovascular', indication:'Hypertension', type:'ARB' },
  { id:'CDSCO-179', name:'Ivabradine', generic:'Ivabradine', substance:'Ivabradine Hydrochloride', mfr:'Servier / Indian generics', date:'2009-01-01', area:'Cardiovascular', indication:'Chronic heart failure, stable angina', type:'If Channel Inhibitor' },
  { id:'CDSCO-180', name:'Darbepoetin Alfa (Cresp)', generic:'Darbepoetin Alfa', substance:'Darbepoetin Alfa', mfr:'Dr. Reddy\'s', date:'2010-01-01', area:'Blood Disorders', indication:'Anemia (CKD, chemotherapy)', type:'Biosimilar' },
  { id:'CDSCO-181', name:'Eltrombopag', generic:'Eltrombopag Olamine', substance:'Eltrombopag Olamine', mfr:'Novartis / Indian generics', date:'2012-01-01', area:'Blood Disorders', indication:'ITP, aplastic anemia', type:'TPO-RA' },
  { id:'CDSCO-182', name:'Dabigatran (Pradaxa)', generic:'Dabigatran Etexilate', substance:'Dabigatran Etexilate Mesylate', mfr:'Boehringer Ingelheim', date:'2010-01-01', area:'Cardiovascular', indication:'Stroke prevention in AF, DVT/PE', type:'Anticoagulant' },
  { id:'CDSCO-183', name:'Hydroxychloroquine', generic:'Hydroxychloroquine Sulfate', substance:'Hydroxychloroquine Sulfate', mfr:'IPCA / Indian generics', date:'1995-01-01', area:'Immunology', indication:'SLE, RA, malaria', type:'Antimalarial/DMARD' },
  { id:'CDSCO-184', name:'Mycophenolate Mofetil', generic:'Mycophenolate Mofetil', substance:'Mycophenolate Mofetil', mfr:'Roche / Indian generics', date:'2001-01-01', area:'Immunology', indication:'Organ transplant rejection prevention', type:'Immunosuppressant' },
  { id:'CDSCO-185', name:'Tacrolimus', generic:'Tacrolimus', substance:'Tacrolimus Monohydrate', mfr:'Astellas / Indian generics', date:'2001-01-01', area:'Immunology', indication:'Organ transplant rejection prevention', type:'Immunosuppressant' },
  { id:'CDSCO-186', name:'Risdiplam (Evrysdi)', generic:'Risdiplam', substance:'Risdiplam', mfr:'Roche', date:'2022-08-01', area:'Rare Disease', indication:'Spinal Muscular Atrophy (SMA)', type:'SMN2 Splicing Modifier' },
  { id:'CDSCO-187', name:'Trastuzumab Deruxtecan (Enhertu)', generic:'T-DXd', substance:'Trastuzumab Deruxtecan', mfr:'Daiichi-Sankyo / AstraZeneca', date:'2023-10-01', area:'Oncology', indication:'HER2+ breast cancer, gastric cancer', type:'ADC' },
  { id:'CDSCO-188', name:'Sotorasib (Lumakras)', generic:'Sotorasib', substance:'Sotorasib', mfr:'Amgen', date:'2023-03-01', area:'Oncology', indication:'KRAS G12C+ NSCLC', type:'Targeted Therapy' },
  { id:'CDSCO-189', name:'Durvalumab + Tremelimumab', generic:'Durvalumab/Tremelimumab', substance:'Durvalumab, Tremelimumab', mfr:'AstraZeneca', date:'2023-06-01', area:'Oncology', indication:'Unresectable HCC', type:'Immunotherapy' },
  { id:'CDSCO-190', name:'Fam-Trastuzumab Deruxtecan', generic:'Fam-Trastuzumab Deruxtecan', substance:'Trastuzumab Deruxtecan', mfr:'Daiichi-Sankyo / AstraZeneca', date:'2024-01-01', area:'Oncology', indication:'HER2-low metastatic breast cancer', type:'ADC' },
  { id:'CDSCO-191', name:'Acalabrutinib (Calquence)', generic:'Acalabrutinib', substance:'Acalabrutinib', mfr:'AstraZeneca', date:'2022-11-01', area:'Oncology', indication:'CLL/SLL, MCL', type:'BTK Inhibitor' },
  { id:'CDSCO-192', name:'Erdafitinib (Balversa)', generic:'Erdafitinib', substance:'Erdafitinib', mfr:'Janssen', date:'2024-03-01', area:'Oncology', indication:'FGFR3+ urothelial carcinoma', type:'Targeted Therapy' },
  { id:'CDSCO-193', name:'Fluconazole', generic:'Fluconazole', substance:'Fluconazole', mfr:'Pfizer / Indian generics', date:'1993-01-01', area:'Antifungal', indication:'Candidiasis, cryptococcal meningitis', type:'Antifungal' },
  { id:'CDSCO-194', name:'Linaclotide', generic:'Linaclotide', substance:'Linaclotide', mfr:'Torrent / Sun Pharma', date:'2016-01-01', area:'Gastrointestinal', indication:'IBS-C, Chronic Idiopathic Constipation', type:'GC-C Agonist' },
  { id:'CDSCO-195', name:'Vedolizumab (Entyvio)', generic:'Vedolizumab', substance:'Vedolizumab', mfr:'Takeda', date:'2016-01-01', area:'Gastrointestinal', indication:'Ulcerative Colitis, Crohn\'s Disease', type:'Biologic' },
  { id:'CDSCO-196', name:'Ustekinumab (Stelara)', generic:'Ustekinumab', substance:'Ustekinumab', mfr:'Janssen', date:'2017-01-01', area:'Immunology', indication:'Psoriasis, PsA, Crohn\'s, UC', type:'Biologic' },
  { id:'CDSCO-197', name:'Guselkumab (Tremfya)', generic:'Guselkumab', substance:'Guselkumab', mfr:'Janssen', date:'2020-01-01', area:'Immunology', indication:'Plaque Psoriasis, PsA', type:'Biologic' },
  { id:'CDSCO-198', name:'Ixekizumab (Taltz)', generic:'Ixekizumab', substance:'Ixekizumab', mfr:'Eli Lilly', date:'2019-01-01', area:'Immunology', indication:'Plaque Psoriasis, PsA, AS', type:'Biologic' },
  { id:'CDSCO-199', name:'Baricitinib (Olumiant)', generic:'Baricitinib', substance:'Baricitinib', mfr:'Eli Lilly / Sun Pharma', date:'2018-01-01', area:'Immunology', indication:'Rheumatoid Arthritis, Atopic Dermatitis', type:'JAK Inhibitor' },
  { id:'CDSCO-200', name:'Abemaciclib (Verzenio)', generic:'Abemaciclib', substance:'Abemaciclib', mfr:'Eli Lilly', date:'2020-03-01', area:'Oncology', indication:'HR+/HER2- advanced breast cancer', type:'CDK4/6 Inhibitor' },
  { id:'CDSCO-201', name:'Nirmatrelvir (standalone)', generic:'Nirmatrelvir', substance:'Nirmatrelvir', mfr:'Pfizer', date:'2022-06-01', area:'Antivirals', indication:'COVID-19 treatment', type:'Protease Inhibitor' },
  { id:'CDSCO-202', name:'Tecovirimat (TPOXX)', generic:'Tecovirimat', substance:'Tecovirimat', mfr:'SIGA Technologies', date:'2022-08-01', area:'Antivirals', indication:'Mpox (Monkeypox)', type:'Antiviral' },
  { id:'CDSCO-203', name:'Baloxavir Marboxil (Xofluza)', generic:'Baloxavir Marboxil', substance:'Baloxavir Marboxil', mfr:'Roche', date:'2021-01-01', area:'Antivirals', indication:'Influenza A and B', type:'Antiviral' },
  { id:'CDSCO-204', name:'Apalutamide (Erleada)', generic:'Apalutamide', substance:'Apalutamide', mfr:'Janssen', date:'2020-09-01', area:'Oncology', indication:'Non-metastatic CRPC', type:'Hormonal Therapy' },
  { id:'CDSCO-205', name:'Darolutamide (Nubeqa)', generic:'Darolutamide', substance:'Darolutamide', mfr:'Bayer', date:'2021-05-01', area:'Oncology', indication:'Non-metastatic CRPC, mHSPC', type:'Hormonal Therapy' },
  { id:'CDSCO-206', name:'Cabozantinib (Cabometyx)', generic:'Cabozantinib', substance:'Cabozantinib S-Malate', mfr:'Exelixis / Ipsen', date:'2020-01-01', area:'Oncology', indication:'Advanced RCC, HCC', type:'Targeted Therapy' },
  { id:'CDSCO-207', name:'Axicabtagene Ciloleucel (Yescarta)', generic:'Axi-cel', substance:'Axicabtagene Ciloleucel', mfr:'Gilead/Kite', date:'2024-06-01', area:'Oncology', indication:'Relapsed/Refractory LBCL', type:'CAR-T Cell Therapy' },
  { id:'CDSCO-208', name:'BCG Vaccine (India)', generic:'BCG Vaccine', substance:'Bacillus Calmette-Guerin', mfr:'Serum Institute / BCG Lab Chennai', date:'1948-01-01', area:'Vaccines', indication:'Tuberculosis prevention', type:'Vaccine' },
  { id:'CDSCO-209', name:'Oral Polio Vaccine (OPV)', generic:'Trivalent OPV', substance:'Poliovirus Types 1,2,3', mfr:'Bharat Biotech / Haffkine', date:'1978-01-01', area:'Vaccines', indication:'Polio prevention', type:'Vaccine' },
  { id:'CDSCO-210', name:'Pentavalent Vaccine (DPT-HepB-Hib)', generic:'Pentavalent Vaccine', substance:'D, P, T, HepB, Hib', mfr:'Serum Institute / Biological E', date:'2011-12-01', area:'Vaccines', indication:'Diphtheria, Pertussis, Tetanus, HepB, Hib', type:'Vaccine' },
  { id:'CDSCO-211', name:'Measles-Rubella Vaccine', generic:'MR Vaccine', substance:'Measles Virus, Rubella Virus', mfr:'Serum Institute of India', date:'2017-02-01', area:'Vaccines', indication:'Measles and Rubella prevention', type:'Vaccine' },
  { id:'CDSCO-212', name:'PCV13 (Pneumococcal)', generic:'PCV13', substance:'Pneumococcal 13-valent Conjugate', mfr:'Pfizer', date:'2010-01-01', area:'Vaccines', indication:'Pneumococcal disease prevention', type:'Vaccine' },
  { id:'CDSCO-213', name:'Rabies Vaccine (Abhayrab)', generic:'Rabies Vaccine (PVRV)', substance:'Purified Vero Cell Rabies Vaccine', mfr:'Indian Immunologicals', date:'2000-01-01', area:'Vaccines', indication:'Rabies prevention', type:'Vaccine' },
  { id:'CDSCO-214', name:'Hepatitis B Vaccine (Gene Vac-B)', generic:'Hepatitis B Recombinant', substance:'Recombinant HBsAg', mfr:'Serum Institute of India', date:'2000-01-01', area:'Vaccines', indication:'Hepatitis B prevention', type:'Vaccine' },
  { id:'CDSCO-215', name:'Influenza Vaccine (Nasovac-S)', generic:'Live Attenuated Influenza Vaccine', substance:'Influenza Virus (reassortant)', mfr:'Serum Institute of India', date:'2010-01-01', area:'Vaccines', indication:'Seasonal Influenza prevention', type:'Vaccine' },
  { id:'CDSCO-216', name:'Cholera Vaccine (Shanchol)', generic:'Oral Cholera Vaccine', substance:'Inactivated V. cholerae', mfr:'Shantha Biotechnics', date:'2009-03-01', area:'Vaccines', indication:'Cholera prevention', type:'Vaccine' },
  { id:'CDSCO-217', name:'Meningococcal A Vaccine (MenAfriVac)', generic:'Meningococcal A Conjugate', substance:'Meningococcal A Polysaccharide-TT', mfr:'Serum Institute of India', date:'2010-06-01', area:'Vaccines', indication:'Meningococcal A prevention', type:'Vaccine' },
  { id:'CDSCO-218', name:'Yellow Fever Vaccine', generic:'Yellow Fever Vaccine (17D)', substance:'Yellow Fever Virus 17D-204', mfr:'Biological E', date:'2012-01-01', area:'Vaccines', indication:'Yellow Fever prevention (travel)', type:'Vaccine' },
  { id:'CDSCO-219', name:'Brigatinib', generic:'Brigatinib', substance:'Brigatinib', mfr:'Takeda', date:'2020-06-01', area:'Oncology', indication:'ALK+ metastatic NSCLC', type:'Targeted Therapy' },
  { id:'CDSCO-220', name:'Mobocertinib', generic:'Mobocertinib', substance:'Mobocertinib Succinate', mfr:'Takeda', date:'2022-04-01', area:'Oncology', indication:'EGFR exon 20 insertion+ NSCLC', type:'Targeted Therapy' },
  { id:'CDSCO-221', name:'Rucaparib', generic:'Rucaparib', substance:'Rucaparib Camsylate', mfr:'Clovis Oncology', date:'2019-10-01', area:'Oncology', indication:'BRCA+ ovarian cancer', type:'PARP Inhibitor' },
  { id:'CDSCO-222', name:'Niraparib', generic:'Niraparib', substance:'Niraparib Tosylate', mfr:'GSK', date:'2019-12-01', area:'Oncology', indication:'Ovarian cancer maintenance', type:'PARP Inhibitor' },
  { id:'CDSCO-223', name:'Galcanezumab (Emgality)', generic:'Galcanezumab', substance:'Galcanezumab-gnlm', mfr:'Eli Lilly', date:'2022-01-01', area:'Neurology', indication:'Migraine prevention, cluster headache', type:'Biologic (CGRP)' },
  { id:'CDSCO-224', name:'Valbenazine', generic:'Valbenazine', substance:'Valbenazine Tosylate', mfr:'Neurocrine', date:'2023-01-01', area:'Neurology', indication:'Tardive Dyskinesia', type:'VMAT2 Inhibitor' },
  { id:'CDSCO-225', name:'Safinamide', generic:'Safinamide', substance:'Safinamide Mesylate', mfr:'Indian generics', date:'2020-01-01', area:'Neurology', indication:'Parkinson\'s Disease (adjunct)', type:'MAO-B Inhibitor' },
  { id:'CDSCO-226', name:'Risankizumab (Skyrizi)', generic:'Risankizumab', substance:'Risankizumab-rzaa', mfr:'AbbVie', date:'2020-08-01', area:'Immunology', indication:'Plaque Psoriasis, PsA, Crohn\'s', type:'Biologic' },
  { id:'CDSCO-227', name:'Filgotinib (Jyseleca)', generic:'Filgotinib', substance:'Filgotinib Maleate', mfr:'Galapagos / Gilead', date:'2022-03-01', area:'Immunology', indication:'Rheumatoid Arthritis, UC', type:'JAK Inhibitor' },
  { id:'CDSCO-228', name:'Belimumab (Benlysta)', generic:'Belimumab', substance:'Belimumab', mfr:'GSK', date:'2018-06-01', area:'Immunology', indication:'SLE, Lupus Nephritis', type:'Biologic' },
  { id:'CDSCO-229', name:'Mepolizumab (Nucala)', generic:'Mepolizumab', substance:'Mepolizumab', mfr:'GSK', date:'2020-01-01', area:'Respiratory', indication:'Severe eosinophilic asthma', type:'Biologic' },
  { id:'CDSCO-230', name:'Benralizumab (Fasenra)', generic:'Benralizumab', substance:'Benralizumab', mfr:'AstraZeneca', date:'2020-06-01', area:'Respiratory', indication:'Severe eosinophilic asthma', type:'Biologic' },
  { id:'CDSCO-231', name:'Omalizumab (Xolair)', generic:'Omalizumab', substance:'Omalizumab', mfr:'Novartis / Genentech', date:'2015-01-01', area:'Respiratory', indication:'Moderate-to-severe allergic asthma', type:'Biologic' },
  { id:'CDSCO-232', name:'Tezepelumab (Tezspire)', generic:'Tezepelumab', substance:'Tezepelumab-ekko', mfr:'AstraZeneca / Amgen', date:'2023-08-01', area:'Respiratory', indication:'Severe asthma (uncontrolled)', type:'Biologic' },
  { id:'CDSCO-233', name:'Elexacaftor/Tezacaftor/Ivacaftor (Trikafta)', generic:'ETI Combination', substance:'Elexacaftor, Tezacaftor, Ivacaftor', mfr:'Vertex', date:'2023-11-01', area:'Rare Disease', indication:'Cystic Fibrosis (F508del)', type:'CFTR Modulator' },
  { id:'CDSCO-234', name:'Voxelotor (Oxbryta)', generic:'Voxelotor', substance:'Voxelotor', mfr:'Pfizer/GBT', date:'2023-01-01', area:'Blood Disorders', indication:'Sickle Cell Disease', type:'HbS Polymerization Inhibitor' },
  { id:'CDSCO-235', name:'Luspatercept (Reblozyl)', generic:'Luspatercept', substance:'Luspatercept-aamt', mfr:'BMS / Merck', date:'2023-06-01', area:'Blood Disorders', indication:'Anemia in MDS, Beta-Thalassemia', type:'Erythroid Maturation Agent' },
  { id:'CDSCO-236', name:'Patisiran (Onpattro)', generic:'Patisiran', substance:'Patisiran', mfr:'Alnylam', date:'2021-12-01', area:'Rare Disease', indication:'hATTR Polyneuropathy', type:'RNAi Therapy' },
  { id:'CDSCO-237', name:'Givosiran (Givlaari)', generic:'Givosiran', substance:'Givosiran Sodium', mfr:'Alnylam', date:'2022-06-01', area:'Rare Disease', indication:'Acute Hepatic Porphyria', type:'RNAi Therapy' },
  { id:'CDSCO-238', name:'Avalglucosidase Alfa (Nexviazyme)', generic:'Avalglucosidase Alfa', substance:'Avalglucosidase Alfa-ngpt', mfr:'Sanofi', date:'2023-04-01', area:'Rare Disease', indication:'Late-onset Pompe Disease', type:'ERT' },
  { id:'CDSCO-239', name:'Eculizumab (Soliris)', generic:'Eculizumab', substance:'Eculizumab', mfr:'Alexion', date:'2017-01-01', area:'Rare Disease', indication:'PNH, aHUS', type:'Complement Inhibitor' },
  { id:'CDSCO-240', name:'Ravulizumab (Ultomiris)', generic:'Ravulizumab', substance:'Ravulizumab-cwvz', mfr:'Alexion', date:'2022-01-01', area:'Rare Disease', indication:'PNH, aHUS', type:'Complement Inhibitor' },
  { id:'CDSCO-241', name:'Enasidenib', generic:'Enasidenib', substance:'Enasidenib Mesylate', mfr:'BMS', date:'2022-01-01', area:'Oncology', indication:'IDH2-mutated AML', type:'Targeted Therapy' },
  { id:'CDSCO-242', name:'Ivosidenib', generic:'Ivosidenib', substance:'Ivosidenib', mfr:'Servier', date:'2023-01-01', area:'Oncology', indication:'IDH1-mutated AML, Cholangiocarcinoma', type:'Targeted Therapy' },
  { id:'CDSCO-243', name:'Gilteritinib (Xospata)', generic:'Gilteritinib', substance:'Gilteritinib Fumarate', mfr:'Astellas', date:'2021-01-01', area:'Oncology', indication:'FLT3-mutated AML', type:'Targeted Therapy' },
  { id:'CDSCO-244', name:'Midostaurin (Rydapt)', generic:'Midostaurin', substance:'Midostaurin', mfr:'Novartis', date:'2019-01-01', area:'Oncology', indication:'FLT3+ AML, Mastocytosis', type:'Targeted Therapy' },
  { id:'CDSCO-245', name:'Azacitidine (Vidaza)', generic:'Azacitidine', substance:'Azacitidine', mfr:'BMS / Indian generics', date:'2010-01-01', area:'Oncology', indication:'MDS, AML', type:'Hypomethylating Agent' },
  { id:'CDSCO-246', name:'Decitabine', generic:'Decitabine', substance:'Decitabine', mfr:'Natco / Indian generics', date:'2012-01-01', area:'Oncology', indication:'MDS, AML', type:'Hypomethylating Agent' },
  { id:'CDSCO-247', name:'Pomalidomide (Pomalyst)', generic:'Pomalidomide', substance:'Pomalidomide', mfr:'BMS', date:'2015-01-01', area:'Oncology', indication:'Relapsed Multiple Myeloma', type:'Immunomodulatory' },
  { id:'CDSCO-248', name:'Isatuximab (Sarclisa)', generic:'Isatuximab', substance:'Isatuximab-irfc', mfr:'Sanofi', date:'2022-01-01', area:'Oncology', indication:'Relapsed Multiple Myeloma', type:'Biologic' },
  { id:'CDSCO-249', name:'Amivantamab (Rybrevant)', generic:'Amivantamab', substance:'Amivantamab-vmjw', mfr:'Janssen', date:'2024-01-01', area:'Oncology', indication:'EGFR exon 20+ NSCLC', type:'Bispecific Antibody' },
  { id:'CDSCO-250', name:'Tisagenlecleucel (Kymriah)', generic:'Tisagenlecleucel', substance:'Tisagenlecleucel', mfr:'Novartis', date:'2024-03-01', area:'Oncology', indication:'ALL, DLBCL (CAR-T)', type:'CAR-T Cell Therapy' },
];

function parseCdscoRecord(r) {
  return {
    source: 'CDSCO',
    source_id: r.id,
    drug_name: r.name,
    generic_name: r.generic,
    active_substance: r.substance,
    manufacturer: r.mfr,
    approval_date: r.date,
    status: 'Approved',
    therapeutic_area: r.area,
    indication: r.indication,
    route: null,
    dosage_form: null,
    application_type: r.type,
    extra_data: null,
  };
}

async function syncCdsco(pool) {
  if (await shouldSkip(pool, 'CDSCO')) {
    console.log('[CDSCO] Synced recently, skipping.');
    return;
  }

  console.log(`[CDSCO] Upserting ${CDSCO_DATA.length} curated records...`);
  const records = CDSCO_DATA.map(parseCdscoRecord);
  const count = await batchUpsert(pool, records);
  await updateSyncMeta(pool, 'CDSCO', count);
  console.log(`[CDSCO] Done. Upserted ${count} records.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn('[sync] DATABASE_URL not set, skipping drug data sync.');
    process.exit(0);
  }

  const pool = getPool();
  try {
    console.log('[sync] Running DDL...');
    await pool.query(DDL);
    console.log('[sync] Tables ready.');

    await syncFda(pool);
    await syncEma(pool);
    await syncCdsco(pool);

    const { rows } = await pool.query('SELECT source, record_count FROM sync_meta ORDER BY source');
    console.log('[sync] Summary:', rows.map((r) => `${r.source}: ${r.record_count}`).join(', '));
    console.log('[sync] All done.');
  } catch (err) {
    console.error('[sync] Fatal error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
