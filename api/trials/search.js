const CT_API = 'https://clinicaltrials.gov/api/v2/studies';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      q = '',
      condition = '',
      status = '',
      phase = '',
      country = '',
      pageSize = '20',
      pageToken = '',
    } = req.query;

    const params = new URLSearchParams();

    if (q) params.set('query.term', q);
    if (condition) params.set('query.cond', condition);
    if (status) {
      const statusMap = {
        recruiting: 'RECRUITING',
        'not yet recruiting': 'NOT_YET_RECRUITING',
        active: 'ACTIVE_NOT_RECRUITING',
        completed: 'COMPLETED',
        terminated: 'TERMINATED',
        withdrawn: 'WITHDRAWN',
        suspended: 'SUSPENDED',
      };
      params.set('filter.overallStatus', statusMap[status.toLowerCase()] || status);
    }
    if (phase) {
      const phaseMap = {
        '1': 'PHASE1',
        '2': 'PHASE2',
        '3': 'PHASE3',
        '4': 'PHASE4',
        early1: 'EARLY_PHASE1',
      };
      params.set('query.term', [q, `AREA[Phase]${phaseMap[phase] || phase}`].filter(Boolean).join(' AND '));
    }
    if (country) params.set('query.locn', `AREA[LocationCountry]${country}`);

    const size = Math.min(parseInt(pageSize, 10) || 20, 50);
    params.set('pageSize', String(size));
    if (pageToken) params.set('pageToken', pageToken);

    params.set('format', 'json');

    const url = `${CT_API}?${params.toString()}`;
    const apiRes = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (!apiRes.ok) {
      const text = await apiRes.text();
      return res.status(apiRes.status).json({ error: text });
    }

    const data = await apiRes.json();

    const studies = (data.studies || []).map((s) => {
      const proto = s.protocolSection || {};
      const id = proto.identificationModule || {};
      const st = proto.statusModule || {};
      const design = proto.designModule || {};
      const cond = proto.conditionsModule || {};
      const arms = proto.armsInterventionsModule || {};
      const loc = proto.contactsLocationsModule || {};
      const desc = proto.descriptionModule || {};
      const sponsor = proto.sponsorCollaboratorsModule || {};

      const locations = (loc.locations || []).map((l) => ({
        facility: l.facility || null,
        city: l.city || null,
        state: l.state || null,
        country: l.country || null,
        lat: l.geoPoint?.lat ?? null,
        lng: l.geoPoint?.lon ?? null,
      }));

      return {
        nctId: id.nctId,
        title: id.briefTitle,
        status: st.overallStatus,
        phase: design.designInfo?.phases || design.phases || null,
        startDate: st.startDateStruct?.date || null,
        completionDate: st.completionDateStruct?.date || null,
        conditions: cond.conditions || [],
        interventions: (arms.interventions || []).map((i) => ({
          type: i.type,
          name: i.name,
        })),
        sponsor: sponsor.leadSponsor?.name || null,
        summary: desc.briefSummary ? desc.briefSummary.slice(0, 300) : null,
        locations,
        enrollmentCount: design.enrollmentInfo?.count || null,
      };
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({
      studies,
      nextPageToken: data.nextPageToken || null,
      totalCount: data.totalCount || studies.length,
    });
  } catch (err) {
    console.error('[trials/search]', err.message);
    return res.status(500).json({ error: 'Failed to fetch clinical trials' });
  }
}
