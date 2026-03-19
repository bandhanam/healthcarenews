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
      q,
      state,
      city,
      specialty,
      credential,
      entity_type,
      format = 'csv',
      limit = 1000  // Max export limit
    } = req.query;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (q && q.trim()) {
      const searchTerm = q.trim();
      if (/^\d+$/.test(searchTerm)) {
        whereConditions.push(`npi LIKE $${paramIndex}`);
        params.push(`${searchTerm}%`);
      } else {
        whereConditions.push(`(
          LOWER(last_name) LIKE LOWER($${paramIndex}) OR 
          LOWER(first_name) LIKE LOWER($${paramIndex}) OR
          LOWER(organization_name) LIKE LOWER($${paramIndex})
        )`);
        params.push(`%${searchTerm}%`);
      }
      paramIndex++;
    }

    if (state && state.trim()) {
      whereConditions.push(`state = $${paramIndex}`);
      params.push(state.trim().toUpperCase());
      paramIndex++;
    }

    if (city && city.trim()) {
      whereConditions.push(`LOWER(city) LIKE LOWER($${paramIndex})`);
      params.push(`%${city.trim()}%`);
      paramIndex++;
    }

    if (specialty && specialty.trim()) {
      whereConditions.push(`LOWER(primary_taxonomy) LIKE LOWER($${paramIndex})`);
      params.push(`%${specialty.trim()}%`);
      paramIndex++;
    }

    if (credential && credential.trim()) {
      whereConditions.push(`LOWER(credential) LIKE LOWER($${paramIndex})`);
      params.push(`%${credential.trim()}%`);
      paramIndex++;
    }

    if (entity_type && ['1', '2'].includes(entity_type)) {
      whereConditions.push(`entity_type = $${paramIndex}`);
      params.push(entity_type);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const maxLimit = Math.min(parseInt(limit), 5000);
    
    const query = `
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
    
    params.push(maxLimit);
    const result = await pool.query(query, params);

    if (format === 'json') {
      return res.status(200).json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });
    }

    // CSV format
    const headers = [
      'NPI', 'Entity Type', 'First Name', 'Last Name', 'Credential',
      'Organization Name', 'Address', 'City', 'State', 'ZIP',
      'Phone', 'Specialty', 'Last Updated'
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
        row.last_update_date || ''
      ];
      csvRows.push(values.map(v => `"${v}"`).join(','));
    }

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=providers_export_${Date.now()}.csv`);
    return res.status(200).send(csv);

  } catch (error) {
    console.error('Provider export error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to export providers',
      message: error.message 
    });
  }
}
