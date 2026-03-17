import { getPool } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const secret = req.headers['x-migrate-secret'] || req.query.secret;
  if (secret !== (process.env.MIGRATE_SECRET || 'healthpulse-migrate-2026')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const pool = getPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pubchem_compounds (
        cid            INTEGER PRIMARY KEY,
        name           TEXT NOT NULL,
        iupac_name     TEXT,
        molecular_formula TEXT,
        molecular_weight  REAL,
        exact_mass     REAL,
        xlogp          REAL,
        tpsa           REAL,
        complexity     REAL,
        hbond_donor    INTEGER,
        hbond_acceptor INTEGER,
        rotatable_bonds INTEGER,
        heavy_atom_count INTEGER,
        charge         INTEGER DEFAULT 0,
        canonical_smiles TEXT,
        isomeric_smiles  TEXT,
        inchi          TEXT,
        inchikey       TEXT,
        drug_likeness  BOOLEAN DEFAULT FALSE,
        synonyms       TEXT[],
        image_url      TEXT,
        created_at     TIMESTAMPTZ DEFAULT NOW(),
        updated_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pc_name ON pubchem_compounds USING gin(to_tsvector('english', name))`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pc_formula ON pubchem_compounds(molecular_formula)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pc_druglike ON pubchem_compounds(drug_likeness)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pc_weight ON pubchem_compounds(molecular_weight)`);

    return res.status(200).json({ success: true, message: 'pubchem_compounds table created' });
  } catch (err) {
    console.error('[pubchem/migrate]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
