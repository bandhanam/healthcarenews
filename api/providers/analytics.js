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
    const { state, credential } = req.query;

    // Build WHERE clause for filtering
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

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Total count
    const totalQuery = `SELECT COUNT(*) as total FROM npi_providers ${whereClause}`;
    const totalResult = await pool.query(totalQuery, params);
    const totalProviders = parseInt(totalResult.rows[0].total);

    // By entity type
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
    const entityResult = await pool.query(entityQuery, params);

    // By state (top 15)
    const stateQuery = `
      SELECT state, COUNT(*) as count
      FROM npi_providers
      ${whereClause ? whereClause + ' AND' : 'WHERE'} state IS NOT NULL AND state != ''
      GROUP BY state
      ORDER BY count DESC
      LIMIT 15
    `;
    const stateResult = await pool.query(stateQuery, params);

    // By credential (top 15)
    const credentialQuery = `
      SELECT credential, COUNT(*) as count
      FROM npi_providers
      ${whereClause ? whereClause + ' AND' : 'WHERE'} credential IS NOT NULL AND credential != ''
      GROUP BY credential
      ORDER BY count DESC
      LIMIT 15
    `;
    const credentialResult = await pool.query(credentialQuery, params);

    // By city (top 20)
    const cityQuery = `
      SELECT city, state, COUNT(*) as count
      FROM npi_providers
      ${whereClause ? whereClause + ' AND' : 'WHERE'} city IS NOT NULL AND city != ''
      GROUP BY city, state
      ORDER BY count DESC
      LIMIT 20
    `;
    const cityResult = await pool.query(cityQuery, params);

    // State map data (all states with counts)
    const mapQuery = `
      SELECT state, COUNT(*) as count
      FROM npi_providers
      WHERE state IS NOT NULL AND state != '' AND LENGTH(state) = 2
      GROUP BY state
      ORDER BY state
    `;
    const mapResult = await pool.query(mapQuery);

    // Recent registrations (last 30 days approximation)
    const recentQuery = `
      SELECT 
        DATE_TRUNC('day', last_update_date) as date,
        COUNT(*) as count
      FROM npi_providers
      WHERE last_update_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', last_update_date)
      ORDER BY date
    `;
    let recentResult;
    try {
      recentResult = await pool.query(recentQuery);
    } catch (e) {
      recentResult = { rows: [] };
    }

    // Specialty distribution (top 10 taxonomies)
    const specialtyQuery = `
      SELECT primary_taxonomy as specialty, COUNT(*) as count
      FROM npi_providers
      ${whereClause ? whereClause + ' AND' : 'WHERE'} primary_taxonomy IS NOT NULL AND primary_taxonomy != ''
      GROUP BY primary_taxonomy
      ORDER BY count DESC
      LIMIT 10
    `;
    const specialtyResult = await pool.query(specialtyQuery, params);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProviders,
          individuals: parseInt(entityResult.rows.find(r => r.entity_type === 'Individual')?.count || 0),
          organizations: parseInt(entityResult.rows.find(r => r.entity_type === 'Organization')?.count || 0),
          totalStates: stateResult.rows.length,
          totalCredentials: credentialResult.rows.length
        },
        byEntityType: entityResult.rows.map(r => ({
          name: r.entity_type,
          value: parseInt(r.count)
        })),
        byState: stateResult.rows.map(r => ({
          state: r.state,
          count: parseInt(r.count)
        })),
        byCredential: credentialResult.rows.map(r => ({
          credential: r.credential,
          count: parseInt(r.count)
        })),
        byCity: cityResult.rows.map(r => ({
          city: r.city,
          state: r.state,
          count: parseInt(r.count)
        })),
        bySpecialty: specialtyResult.rows.map(r => ({
          specialty: r.specialty,
          count: parseInt(r.count)
        })),
        mapData: mapResult.rows.reduce((acc, r) => {
          acc[r.state] = parseInt(r.count);
          return acc;
        }, {}),
        recentActivity: recentResult.rows.map(r => ({
          date: r.date,
          count: parseInt(r.count)
        }))
      }
    });

  } catch (error) {
    console.error('Provider analytics error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get analytics',
      message: error.message 
    });
  }
}
