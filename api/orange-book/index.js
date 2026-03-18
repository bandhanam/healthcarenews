import AdmZip from 'adm-zip';

const FDA_OB_URL = 'https://www.fda.gov/media/76860/download';

function parseTildeFile(buf) {
  const text = buf.toString('utf8');
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => line.split('~'));
}

function parseProducts(rows) {
  return rows.map((r) => ({
    applicant_full: r[0] || '',
    type: r[1] || '',
    rs: r[2] || '',
    rld: r[3] || '',
    approval_date: r[4] || '',
    te_code: r[5] || '',
    product_number: r[6] || '',
    nda_number: r[7] || '',
    nda_type: r[8] || '',
    strength: r[9] || '',
    applicant: r[10] || '',
    trade_name: r[11] || '',
    dosage_route: r[12] || '',
    ingredient: r[13] || '',
  }));
}

function parsePatents(rows) {
  return rows.map((r) => ({
    patent_submission_date: r[0] || '',
    delist_flag: r[1] || '',
    use_code: r[2] || '',
    drug_product_flag: r[3] || '',
    drug_substance_flag: r[4] || '',
    patent_expire_date: r[5] || '',
    patent_number: r[6] || '',
    product_number: r[7] || '',
    nda_number: r[8] || '',
    nda_type: r[9] || '',
  }));
}

function parseExclusivity(rows) {
  return rows.map((r) => ({
    exclusivity_date: r[0] || '',
    exclusivity_code: r[1] || '',
    product_number: r[2] || '',
    nda_number: r[3] || '',
    nda_type: r[4] || '',
  }));
}

function parseDate(s) {
  if (!s || s.includes('prior to')) return null;
  const m = s.match(/(\w{3})\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return null;
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const month = months[m[1]];
  if (month === undefined) return null;
  const d = new Date(parseInt(m[3], 10), month, parseInt(m[2], 10));
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { view = 'patents', nda = '', drug = '', limit = '100' } = req.query;
    const lim = Math.min(parseInt(limit, 10) || 100, 500);

    const resp = await fetch(FDA_OB_URL, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) throw new Error('Failed to fetch Orange Book');
    const zipBuf = Buffer.from(await resp.arrayBuffer());
    const zip = new AdmZip(zipBuf);
    const entries = zip.getEntries();

    const getFile = (name) => {
      const e = entries.find((x) => x.entryName.endsWith(name));
      return e ? parseTildeFile(e.getData()) : [];
    };

    const productRows = getFile('products.txt');
    const patentRows = getFile('patent.txt');
    const exclusivityRows = getFile('exclusivity.txt');

    const products = parseProducts(productRows);
    const patents = parsePatents(patentRows);
    const exclusivities = parseExclusivity(exclusivityRows);

    const ndaFilter = (nda || '').trim().toUpperCase();
    const drugFilter = (drug || '').trim().toLowerCase();

    const byNda = (arr, key = 'nda_number') =>
      ndaFilter ? arr.filter((x) => (x[key] || '').toUpperCase().includes(ndaFilter)) : arr;
    const byDrug = (arr) =>
      drugFilter
        ? arr.filter(
            (x) =>
              (x.trade_name || '').toLowerCase().includes(drugFilter) ||
              (x.ingredient || '').toLowerCase().includes(drugFilter) ||
              (x.applicant_full || '').toLowerCase().includes(drugFilter)
          )
        : arr;

    if (view === 'patents') {
      let out = patents
        .filter((p) => p.nda_type === 'N')
        .map((p) => {
          const prod = products.find(
            (pr) => pr.nda_number === p.nda_number && pr.nda_type === p.nda_type && pr.product_number === p.product_number
          );
          return {
            nda_number: p.nda_number,
            trade_name: prod?.trade_name || '',
            ingredient: prod?.ingredient || '',
            applicant: prod?.applicant_full || '',
            patent_number: p.patent_number,
            patent_expire_date: p.patent_expire_date,
            patent_expire_parsed: parseDate(p.patent_expire_date),
            use_code: p.use_code,
          };
        });
      out = byNda(out, 'nda_number');
      out = byDrug(out);
      out = out.filter((x) => x.patent_expire_parsed).sort((a, b) => a.patent_expire_parsed.localeCompare(b.patent_expire_parsed));
      return res
        .setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate')
        .status(200)
        .json({ total: out.length, patents: out.slice(0, lim) });
    }

    if (view === 'exclusivity') {
      let out = exclusivities
        .filter((e) => e.nda_type === 'N')
        .map((e) => {
          const prod = products.find(
            (pr) => pr.nda_number === e.nda_number && pr.nda_type === e.nda_type && pr.product_number === e.product_number
          );
          return {
            nda_number: e.nda_number,
            trade_name: prod?.trade_name || '',
            ingredient: prod?.ingredient || '',
            applicant: prod?.applicant_full || '',
            exclusivity_date: e.exclusivity_date,
            exclusivity_parsed: parseDate(e.exclusivity_date),
            exclusivity_code: e.exclusivity_code,
          };
        });
      out = byNda(out, 'nda_number');
      out = byDrug(out);
      out = out.filter((x) => x.exclusivity_parsed).sort((a, b) => a.exclusivity_parsed.localeCompare(b.exclusivity_parsed));
      return res
        .setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate')
        .status(200)
        .json({ total: out.length, exclusivities: out.slice(0, lim) });
    }

    if (view === 'generics') {
      const innovators = products.filter((p) => p.nda_type === 'N');
      const generics = products.filter((p) => p.nda_type === 'A');
      let out = generics.map((g) => {
        const innov = innovators.find((i) => i.ingredient && i.ingredient === g.ingredient);
        return {
          nda_number: g.nda_number,
          trade_name: g.trade_name,
          ingredient: g.ingredient,
          applicant: g.applicant_full,
          approval_date: g.approval_date,
          te_code: g.te_code,
          innovator_nda: innov?.nda_number || null,
        };
      });
      out = byNda(out, 'nda_number');
      out = byDrug(out);
      out = out.sort((a, b) => (b.approval_date || '').localeCompare(a.approval_date || ''));
      return res
        .setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate')
        .status(200)
        .json({ total: out.length, generics: out.slice(0, lim) });
    }

    if (view === 'cliffs') {
      const now = new Date();
      const future = new Date(now.getFullYear() + 3, 11, 31);
      const patentList = patents
        .filter((p) => p.nda_type === 'N' && p.patent_expire_date)
        .map((p) => {
          const prod = products.find(
            (pr) => pr.nda_number === p.nda_number && pr.nda_type === p.nda_type && pr.product_number === p.product_number
          );
          const parsed = parseDate(p.patent_expire_date);
          return {
            nda_number: p.nda_number,
            trade_name: prod?.trade_name || '',
            ingredient: prod?.ingredient || '',
            applicant: prod?.applicant_full || '',
            patent_number: p.patent_number,
            patent_expire_date: p.patent_expire_date,
            patent_expire_parsed: parsed,
          };
        })
        .filter((x) => x.patent_expire_parsed);
      let cliffs = patentList
        .filter((x) => x.patent_expire_parsed >= now.toISOString().slice(0, 10) && x.patent_expire_parsed <= future.toISOString().slice(0, 10))
        .sort((a, b) => a.patent_expire_parsed.localeCompare(b.patent_expire_parsed));
      const seen = new Set();
      cliffs = cliffs.filter((x) => {
        const k = `${x.nda_number}-${x.ingredient}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      cliffs = byNda(cliffs, 'nda_number');
      cliffs = byDrug(cliffs);
      return res
        .setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate')
        .status(200)
        .json({ total: cliffs.length, cliffs: cliffs.slice(0, lim) });
    }

    return res.status(400).json({ error: 'Invalid view. Use: patents, exclusivity, generics, cliffs' });
  } catch (err) {
    console.error('[orange-book]', err.message);
    return res.status(500).json({ error: err.message || 'Failed to fetch Orange Book' });
  }
}
