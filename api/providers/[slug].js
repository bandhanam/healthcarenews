import { getPool } from '../_lib/db.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function normalizeSlug(slug) {
  if (Array.isArray(slug)) return slug.filter(Boolean);
  if (typeof slug === 'string' && slug.trim()) return [slug.trim()];
  return [];
}

function buildFilters(query, includeSearch = true) {
  const whereConditions = [];
  const params = [];
  let paramIndex = 1;

  if (includeSearch && query.q && query.q.trim()) {
    const searchTerm = query.q.trim();
    if (/^\d+$/.test(searchTerm)) {
      whereConditions.push(`npi LIKE $${paramIndex}`);
      params.push(`${searchTerm}%`);
    } else {
      whereConditions.push(`(LOWER(last_name) LIKE LOWER($${paramIndex}) OR LOWER(first_name) LIKE LOWER($${paramIndex}) OR LOWER(organization_name) LIKE LOWER($${paramIndex}))`);
      params.push(`%${searchTerm}%`);
    }
    paramIndex++;
  }

  if (query.state && query.state.trim()) {
    whereConditions.push(`state = $${paramIndex}`);
    params.push(query.state.trim().toUpperCase());
    paramIndex++;
  }

  if (query.city && query.city.trim()) {
    whereConditions.push(`LOWER(city) LIKE LOWER($${paramIndex})`);
    params.push(`%${query.city.trim()}%`);
    paramIndex++;
  }

  if (query.specialty && query.specialty.trim()) {
    whereConditions.push(`LOWER(primary_taxonomy) LIKE LOWER($${paramIndex})`);
    params.push(`%${query.specialty.trim()}%`);
    paramIndex++;
  }

  if (query.credential && query.credential.trim()) {
    whereConditions.push(`LOWER(credential) LIKE LOWER($${paramIndex})`);
    params.push(`%${query.credential.trim()}%`);
    paramIndex++;
  }

  if (query.entity_type && ['1', '2'].includes(query.entity_type)) {
    whereConditions.push(`entity_type = $${paramIndex}`);
    params.push(query.entity_type);
    paramIndex++;
  }

  return {
    whereClause: whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '',
    params,
    paramIndex,
  };
}

async function handleSearch(pool, query, res) {
  const { whereClause, params, paramIndex } = buildFilters(query, true);
  const limit = Math.max(1, parseInt(query.limit, 10) || 50);
  const offset = Math.max(0, parseInt(query.offset, 10) || 0);
  const validSortColumns = ['last_name', 'first_name', 'state', 'city', 'credential', 'npi', 'organization_name'];
  const sortColumn = validSortColumns.includes(query.sort) ? query.sort : 'last_name';
  const sortOrder = query.order && query.order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  const countQuery = `SELECT COUNT(*) as total FROM npi_providers ${whereClause}`;
  const dataQuery = `
    SELECT
      npi,
      entity_type,
      first_name,
      last_name,
      credential,
      organization_name,
      address_1,
      city,
      state,
      zip,
      phone,
      primary_taxonomy,
      last_update_date
    FROM npi_providers
    ${whereClause}
    ORDER BY ${sortColumn} ${sortOrder} NULLS LAST
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const [countResult, result] = await Promise.all([
    pool.query(countQuery, params),
    pool.query(dataQuery, [...params, limit, offset]),
  ]);

  const total = parseInt(countResult.rows[0].total, 10);
  const providers = result.rows.map((row) => ({
    npi: row.npi,
    entityType: row.entity_type === '1' ? 'Individual' : 'Organization',
    name: row.entity_type === '1' ? `${row.first_name || ''} ${row.last_name || ''}`.trim() : row.organization_name,
    firstName: row.first_name,
    lastName: row.last_name,
    credential: row.credential,
    organizationName: row.organization_name,
    address: row.address_1,
    city: row.city,
    state: row.state,
    zip: row.zip,
    phone: row.phone,
    specialty: row.primary_taxonomy,
    lastUpdated: row.last_update_date,
  }));

  return res.status(200).json({
    success: true,
    data: providers,
    pagination: {
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
      currentPage: Math.floor(offset / limit) + 1,
    },
  });
}

async function handleAnalytics(pool, query, res) {
  const { whereClause, params } = buildFilters(query, false);

  const totalQuery = `SELECT COUNT(*) as total FROM npi_providers ${whereClause}`;
  const entityQuery = `
    SELECT
      CASE entity_type
        WHEN '1' THEN 'Individual'
        WHEN '2' THEN 'Organization'
        ELSE 'Unknown'
      END as entity_type,
      COUNT(*) as count
    FROM npi_providers
    ${whereClause}
    GROUP BY entity_type
    ORDER BY count DESC
  `;
  const stateQuery = `
    SELECT state, COUNT(*) as count
    FROM npi_providers
    ${whereClause ? `${whereClause} AND` : 'WHERE'} state IS NOT NULL AND state != ''
    GROUP BY state
    ORDER BY count DESC
    LIMIT 15
  `;
  const credentialQuery = `
    SELECT credential, COUNT(*) as count
    FROM npi_providers
    ${whereClause ? `${whereClause} AND` : 'WHERE'} credential IS NOT NULL AND credential != ''
    GROUP BY credential
    ORDER BY count DESC
    LIMIT 15
  `;
  const cityQuery = `
    SELECT city, state, COUNT(*) as count
    FROM npi_providers
    ${whereClause ? `${whereClause} AND` : 'WHERE'} city IS NOT NULL AND city != ''
    GROUP BY city, state
    ORDER BY count DESC
    LIMIT 20
  `;
  const mapQuery = `
    SELECT state, COUNT(*) as count
    FROM npi_providers
    WHERE state IS NOT NULL AND state != '' AND LENGTH(state) = 2
    GROUP BY state
    ORDER BY state
  `;
  const recentQuery = `
    SELECT
      DATE_TRUNC('day', last_update_date) as date,
      COUNT(*) as count
    FROM npi_providers
    WHERE last_update_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', last_update_date)
    ORDER BY date
  `;
  const specialtyQuery = `
    SELECT primary_taxonomy as specialty, COUNT(*) as count
    FROM npi_providers
    ${whereClause ? `${whereClause} AND` : 'WHERE'} primary_taxonomy IS NOT NULL AND primary_taxonomy != ''
    GROUP BY primary_taxonomy
    ORDER BY count DESC
    LIMIT 10
  `;

  const [totalResult, entityResult, stateResult, credentialResult, cityResult, mapResult, recentResult, specialtyResult] = await Promise.all([
    pool.query(totalQuery, params),
    pool.query(entityQuery, params),
    pool.query(stateQuery, params),
    pool.query(credentialQuery, params),
    pool.query(cityQuery, params),
    pool.query(mapQuery),
    pool.query(recentQuery).catch(() => ({ rows: [] })),
    pool.query(specialtyQuery, params),
  ]);

  const totalProviders = parseInt(totalResult.rows[0].total, 10);

  return res.status(200).json({
    success: true,
    data: {
      summary: {
        totalProviders,
        individuals: parseInt(entityResult.rows.find((r) => r.entity_type === 'Individual')?.count || 0, 10),
        organizations: parseInt(entityResult.rows.find((r) => r.entity_type === 'Organization')?.count || 0, 10),
        totalStates: stateResult.rows.length,
        totalCredentials: credentialResult.rows.length,
      },
      byEntityType: entityResult.rows.map((r) => ({ name: r.entity_type, value: parseInt(r.count, 10) })),
      byState: stateResult.rows.map((r) => ({ state: r.state, count: parseInt(r.count, 10) })),
      byCredential: credentialResult.rows.map((r) => ({ credential: r.credential, count: parseInt(r.count, 10) })),
      byCity: cityResult.rows.map((r) => ({ city: r.city, state: r.state, count: parseInt(r.count, 10) })),
      bySpecialty: specialtyResult.rows.map((r) => ({ specialty: r.specialty, count: parseInt(r.count, 10) })),
      mapData: mapResult.rows.reduce((acc, r) => {
        acc[r.state] = parseInt(r.count, 10);
        return acc;
      }, {}),
      recentActivity: recentResult.rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) })),
    },
  });
}

async function handleExport(pool, query, res) {
  const { whereClause, params, paramIndex } = buildFilters(query, true);
  const maxLimit = Math.min(parseInt(query.limit, 10) || 1000, 5000);
  const format = query.format || 'csv';

  const exportQuery = `
    SELECT
      npi,
      entity_type,
      first_name,
      last_name,
      credential,
      organization_name,
      address_1,
      city,
      state,
      zip,
      phone,
      primary_taxonomy,
      last_update_date
    FROM npi_providers
    ${whereClause}
    ORDER BY last_name, first_name
    LIMIT $${paramIndex}
  `;

  const result = await pool.query(exportQuery, [...params, maxLimit]);

  if (format === 'json') {
    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  }

  const headers = [
    'NPI', 'Entity Type', 'First Name', 'Last Name', 'Credential',
    'Organization Name', 'Address', 'City', 'State', 'ZIP',
    'Phone', 'Specialty', 'Last Updated',
  ];

  const csvRows = [headers.join(',')];
  for (const row of result.rows) {
    const values = [
      row.npi,
      row.entity_type === '1' ? 'Individual' : 'Organization',
      (row.first_name || '').replace(/,/g, ''),
      (row.last_name || '').replace(/,/g, ''),
      (row.credential || '').replace(/,/g, ''),
      (row.organization_name || '').replace(/,/g, ''),
      (row.address_1 || '').replace(/,/g, ''),
      (row.city || '').replace(/,/g, ''),
      row.state || '',
      row.zip || '',
      row.phone || '',
      (row.primary_taxonomy || '').replace(/,/g, ''),
      row.last_update_date || '',
    ];
    csvRows.push(values.map((v) => `"${v}"`).join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=providers_export_${Date.now()}.csv`);
  return res.status(200).send(csvRows.join('\n'));
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const [action] = normalizeSlug(req.query.slug);
  const pool = getPool();

  try {
    if (action === 'search') return await handleSearch(pool, req.query, res);
    if (action === 'analytics') return await handleAnalytics(pool, req.query, res);
    if (action === 'export') return await handleExport(pool, req.query, res);

    return res.status(404).json({
      error: 'Unknown providers route',
      available: ['search', 'analytics', 'export'],
    });
  } catch (error) {
    console.error('Provider route error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process provider request',
      message: error.message,
    });
  }
}
