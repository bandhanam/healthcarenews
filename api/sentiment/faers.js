const OPENFDA = 'https://api.fda.gov/drug/event.json';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { drug = '', limit = '100' } = req.query;
    if (!drug.trim()) {
      return res.status(400).json({ error: 'drug parameter is required' });
    }

    const lim = Math.min(parseInt(limit, 10) || 100, 100);
    const search = encodeURIComponent(`patient.drug.medicinalproduct:"${drug}"`);
    const url = `${OPENFDA}?search=${search}&limit=${lim}`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      if (errData.error?.code === 'NOT_FOUND') {
        return res.status(200).json({ drug, total: 0, events: [], reactions: {}, outcomes: {}, demographics: {} });
      }
      throw new Error(errData.error?.message || 'openFDA request failed');
    }

    const data = await resp.json();
    const results = data.results || [];
    const total = data.meta?.results?.total || results.length;

    const reactions = {};
    const outcomes = {};
    const demographics = { male: 0, female: 0, unknown: 0, ageGroups: {} };
    const events = [];

    for (const r of results) {
      const sex = r.patient?.patientsex;
      if (sex === '1') demographics.male++;
      else if (sex === '2') demographics.female++;
      else demographics.unknown++;

      const age = r.patient?.patientonsetage;
      const ageUnit = r.patient?.patientonsetageunit;
      if (age && ageUnit === '801') {
        const ageNum = parseFloat(age);
        const group = ageNum < 18 ? '<18' : ageNum < 40 ? '18-39' : ageNum < 65 ? '40-64' : '65+';
        demographics.ageGroups[group] = (demographics.ageGroups[group] || 0) + 1;
      }

      const rxns = r.patient?.reaction || [];
      for (const rx of rxns) {
        const term = rx.reactionmeddrapt;
        if (term) reactions[term] = (reactions[term] || 0) + 1;
      }

      const outcome = r.patient?.reactionoutcome || r.serious;
      const outcomeLabel = outcome === '1' ? 'Recovered' : outcome === '2' ? 'Recovering' : outcome === '3' ? 'Not Recovered' : outcome === '4' ? 'Fatal' : outcome === '5' ? 'Unknown' : 'Other';
      outcomes[outcomeLabel] = (outcomes[outcomeLabel] || 0) + 1;

      events.push({
        id: r.safetyreportid,
        receiveDate: r.receivedate,
        serious: r.serious === '1',
        seriousReason: [
          r.seriousnessdeath === '1' && 'Death',
          r.seriousnesslifethreatening === '1' && 'Life-threatening',
          r.seriousnesshospitalization === '1' && 'Hospitalization',
          r.seriousnessdisabling === '1' && 'Disability',
          r.seriousnesscongenitalanomali === '1' && 'Congenital anomaly',
          r.seriousnessother === '1' && 'Other serious',
        ].filter(Boolean),
        reactions: rxns.map((rx) => rx.reactionmeddrapt).filter(Boolean),
        country: r.occurcountry || r.primarysource?.reportercountry || 'Unknown',
        source: r.primarysource?.qualification === '1' ? 'Physician' : r.primarysource?.qualification === '2' ? 'Pharmacist' : r.primarysource?.qualification === '3' ? 'Other HCP' : r.primarysource?.qualification === '5' ? 'Consumer' : 'Unknown',
      });
    }

    const topReactions = Object.entries(reactions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([term, count]) => ({ term, count }));

    const outcomesArr = Object.entries(outcomes).map(([label, count]) => ({ label, count }));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({
      drug,
      total,
      eventsReturned: events.length,
      reactions: topReactions,
      outcomes: outcomesArr,
      demographics,
      events: events.slice(0, 50),
    });
  } catch (err) {
    console.error('[sentiment/faers]', err.message);
    return res.status(500).json({ error: err.message || 'Failed to fetch FAERS data' });
  }
}
