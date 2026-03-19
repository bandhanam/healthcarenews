import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      q,           // Search query (name, NPI)
      state,       // State filter
      city,        // City filter
      specialty,   // Taxonomy/specialty filter
      credential,  // Credential filter (MD, DO, NP, etc.)
      entity_type, // 1 = Individual, 2 = Organization
      limit = 50,
      offset = 0,
      sort = 'last_name',
      order = 'asc'
    } = req.query;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Search query (name or NPI)
    if (q && q.trim()) {
      const searchTerm = q.trim();
      if (/^\d+$/.test(searchTerm)) {
        // NPI search
        whereConditions.push(`npi LIKE $${paramIndex}`);
        params.push(`${searchTerm}%`);
      } else {
        // Name search
        whereConditions.push(`(
          LOWER(last_name) LIKE LOWER($${paramIndex}) OR 
          LOWER(first_name) LIKE LOWER($${paramIndex}) OR
          LOWER(organization_name) LIKE LOWER($${paramIndex})
        )`);
        params.push(`%${searchTerm}%`);
      }
      paramIndex++;
    }

    // State filter
    if (state && state.trim()) {
      whereConditions.push(`state = $${paramIndex}`);
      params.push(state.trim().toUpperCase());
      paramIndex++;
    }

    // City filter
    if (city && city.trim()) {
      whereConditions.push(`LOWER(city) LIKE LOWER($${paramIndex})`);
      params.push(`%${city.trim()}%`);
      paramIndex++;
    }

    // Specialty filter
    if (specialty && specialty.trim()) {
      whereConditions.push(`LOWER(primary_taxonomy) LIKE LOWER($${paramIndex})`);
      params.push(`%${specialty.trim()}%`);
      paramIndex++;
    }

    // Credential filter
    if (credential && credential.trim()) {
      whereConditions.push(`LOWER(credential) LIKE LOWER($${paramIndex})`);
      params.push(`%${credential.trim()}%`);
      paramIndex++;
    }

    // Entity type filter
    if (entity_type && ['1', '2'].includes(entity_type)) {
      whereConditions.push(`entity_type = $${paramIndex}`);
      params.push(entity_type);
      paramIndex++;
    }

    // Build WHERE clause
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Validate sort column
    const validSortColumns = ['last_name', 'first_name', 'state', 'city', 'credential', 'npi', 'organization_name'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'last_name';
    const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // Count query
    const countQuery = `SELECT COUNT(*) as total FROM npi_providers ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Data query
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
    
    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(dataQuery, params);

    // Format results
    const providers = result.rows.map(row => ({
      npi: row.npi,
      entityType: row.entity_type === '1' ? 'Individual' : 'Organization',
      name: row.entity_type === '1' 
        ? `${row.first_name || ''} ${row.last_name || ''}`.trim()
        : row.organization_name,
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
      lastUpdated: row.last_update_date
    }));

    return res.status(200).json({
      success: true,
      data: providers,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit)),
        currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1
      }
    });

  } catch (error) {
    console.error('Provider search error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to search providers',
      message: error.message 
    });
  }
}
