import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Provider Search API
app.get('/api/providers/search', async (req, res) => {
  try {
    const { q, state, city, specialty, credential, entity_type, limit = 50, offset = 0, sort = 'last_name', order = 'asc' } = req.query;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (q && q.trim()) {
      const searchTerm = q.trim();
      if (/^\d+$/.test(searchTerm)) {
        whereConditions.push(`npi LIKE $${paramIndex}`);
        params.push(`${searchTerm}%`);
      } else {
        whereConditions.push(`(LOWER(last_name) LIKE LOWER($${paramIndex}) OR LOWER(first_name) LIKE LOWER($${paramIndex}) OR LOWER(organization_name) LIKE LOWER($${paramIndex}))`);
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

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const validSortColumns = ['last_name', 'first_name', 'state', 'city', 'credential', 'npi', 'organization_name'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'last_name';
    const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const countQuery = `SELECT COUNT(*) as total FROM npi_providers ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT npi, entity_type, first_name, last_name, credential, organization_name, address_1, city, state, zip, phone, primary_taxonomy, last_update_date
      FROM npi_providers ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder} NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(dataQuery, params);

    const providers = result.rows.map(row => ({
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
      lastUpdated: row.last_update_date
    }));

    res.json({
      success: true,
      data: providers,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset), pages: Math.ceil(total / parseInt(limit)), currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1 }
    });
  } catch (error) {
    console.error('Provider search error:', error);
    res.status(500).json({ success: false, error: 'Failed to search providers', message: error.message });
  }
});

// Provider Analytics API
app.get('/api/providers/analytics', async (req, res) => {
  try {
    const { state, credential } = req.query;
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (state && state.trim()) {
      whereConditions.push(`state = $${paramIndex}`);
      params.push(state.trim().toUpperCase());
      paramIndex++;
    }

    if (credential && credential.trim()) {
      whereConditions.push(`LOWER(credential) LIKE LOWER($${paramIndex})`);
      params.push(`%${credential.trim()}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const totalQuery = `SELECT COUNT(*) as total FROM npi_providers ${whereClause}`;
    const totalResult = await pool.query(totalQuery, params);
    const totalProviders = parseInt(totalResult.rows[0].total);

    const entityQuery = `SELECT CASE entity_type WHEN '1' THEN 'Individual' WHEN '2' THEN 'Organization' ELSE 'Unknown' END as entity_type, COUNT(*) as count FROM npi_providers ${whereClause} GROUP BY entity_type ORDER BY count DESC`;
    const entityResult = await pool.query(entityQuery, params);

    const stateQuery = `SELECT state, COUNT(*) as count FROM npi_providers ${whereClause ? whereClause + ' AND' : 'WHERE'} state IS NOT NULL AND state != '' GROUP BY state ORDER BY count DESC LIMIT 15`;
    const stateResult = await pool.query(stateQuery, params);

    const credentialQuery = `SELECT credential, COUNT(*) as count FROM npi_providers ${whereClause ? whereClause + ' AND' : 'WHERE'} credential IS NOT NULL AND credential != '' GROUP BY credential ORDER BY count DESC LIMIT 15`;
    const credentialResult = await pool.query(credentialQuery, params);

    const cityQuery = `SELECT city, state, COUNT(*) as count FROM npi_providers ${whereClause ? whereClause + ' AND' : 'WHERE'} city IS NOT NULL AND city != '' GROUP BY city, state ORDER BY count DESC LIMIT 20`;
    const cityResult = await pool.query(cityQuery, params);

    const mapQuery = `SELECT state, COUNT(*) as count FROM npi_providers WHERE state IS NOT NULL AND state != '' AND LENGTH(state) = 2 GROUP BY state ORDER BY state`;
    const mapResult = await pool.query(mapQuery);

    const specialtyQuery = `SELECT primary_taxonomy as specialty, COUNT(*) as count FROM npi_providers ${whereClause ? whereClause + ' AND' : 'WHERE'} primary_taxonomy IS NOT NULL AND primary_taxonomy != '' GROUP BY primary_taxonomy ORDER BY count DESC LIMIT 10`;
    const specialtyResult = await pool.query(specialtyQuery, params);

    res.json({
      success: true,
      data: {
        summary: {
          totalProviders,
          individuals: parseInt(entityResult.rows.find(r => r.entity_type === 'Individual')?.count || 0),
          organizations: parseInt(entityResult.rows.find(r => r.entity_type === 'Organization')?.count || 0),
          totalStates: stateResult.rows.length,
          totalCredentials: credentialResult.rows.length
        },
        byEntityType: entityResult.rows.map(r => ({ name: r.entity_type, value: parseInt(r.count) })),
        byState: stateResult.rows.map(r => ({ state: r.state, count: parseInt(r.count) })),
        byCredential: credentialResult.rows.map(r => ({ credential: r.credential, count: parseInt(r.count) })),
        byCity: cityResult.rows.map(r => ({ city: r.city, state: r.state, count: parseInt(r.count) })),
        bySpecialty: specialtyResult.rows.map(r => ({ specialty: r.specialty, count: parseInt(r.count) })),
        mapData: mapResult.rows.reduce((acc, r) => { acc[r.state] = parseInt(r.count); return acc; }, {}),
        recentActivity: []
      }
    });
  } catch (error) {
    console.error('Provider analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to get analytics', message: error.message });
  }
});

// Export API
app.get('/api/providers/export', async (req, res) => {
  try {
    const { q, state, city, specialty, credential, entity_type, format = 'csv', limit = 1000 } = req.query;
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (q && q.trim()) {
      const searchTerm = q.trim();
      if (/^\d+$/.test(searchTerm)) {
        whereConditions.push(`npi LIKE $${paramIndex}`);
        params.push(`${searchTerm}%`);
      } else {
        whereConditions.push(`(LOWER(last_name) LIKE LOWER($${paramIndex}) OR LOWER(first_name) LIKE LOWER($${paramIndex}) OR LOWER(organization_name) LIKE LOWER($${paramIndex}))`);
        params.push(`%${searchTerm}%`);
      }
      paramIndex++;
    }

    if (state && state.trim()) { whereConditions.push(`state = $${paramIndex}`); params.push(state.trim().toUpperCase()); paramIndex++; }
    if (city && city.trim()) { whereConditions.push(`LOWER(city) LIKE LOWER($${paramIndex})`); params.push(`%${city.trim()}%`); paramIndex++; }
    if (specialty && specialty.trim()) { whereConditions.push(`LOWER(primary_taxonomy) LIKE LOWER($${paramIndex})`); params.push(`%${specialty.trim()}%`); paramIndex++; }
    if (credential && credential.trim()) { whereConditions.push(`LOWER(credential) LIKE LOWER($${paramIndex})`); params.push(`%${credential.trim()}%`); paramIndex++; }
    if (entity_type && ['1', '2'].includes(entity_type)) { whereConditions.push(`entity_type = $${paramIndex}`); params.push(entity_type); paramIndex++; }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const maxLimit = Math.min(parseInt(limit), 5000);

    const query = `SELECT npi, entity_type, first_name, last_name, credential, organization_name, address_1, city, state, zip, phone, primary_taxonomy, last_update_date FROM npi_providers ${whereClause} ORDER BY last_name, first_name LIMIT $${paramIndex}`;
    params.push(maxLimit);
    const result = await pool.query(query, params);

    if (format === 'json') {
      return res.json({ success: true, count: result.rows.length, data: result.rows });
    }

    const headers = ['NPI', 'Entity Type', 'First Name', 'Last Name', 'Credential', 'Organization Name', 'Address', 'City', 'State', 'ZIP', 'Phone', 'Specialty', 'Last Updated'];
    const csvRows = [headers.join(',')];
    for (const row of result.rows) {
      const values = [row.npi, row.entity_type === '1' ? 'Individual' : 'Organization', (row.first_name || '').replace(/,/g, ''), (row.last_name || '').replace(/,/g, ''), (row.credential || '').replace(/,/g, ''), (row.organization_name || '').replace(/,/g, ''), (row.address_1 || '').replace(/,/g, ''), (row.city || '').replace(/,/g, ''), row.state || '', row.zip || '', row.phone || '', (row.primary_taxonomy || '').replace(/,/g, ''), row.last_update_date || ''];
      csvRows.push(values.map(v => `"${v}"`).join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=providers_export_${Date.now()}.csv`);
    res.send(csvRows.join('\n'));
  } catch (error) {
    console.error('Provider export error:', error);
    res.status(500).json({ success: false, error: 'Failed to export providers', message: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
