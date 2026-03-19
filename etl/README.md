# NPI Physician ETL

Extract, Transform, and Load physician data from NPPES (National Plan and Provider Enumeration System) into your PostgreSQL/CockroachDB database.

## Two Options

### Option 1: API ETL (Recommended for Start)
- Uses NPPES REST API
- No large file downloads
- Faster initial setup
- Good for testing and incremental loads

### Option 2: Full File ETL
- Downloads complete NPPES file (~8GB)
- Processes all 7.5M providers
- Filters to physicians only (~1.1M records)
- Best for complete data load

---

## Quick Start (API ETL)

### 1. Install Dependencies

```bash
cd etl
pip install -r requirements.txt
```

### 2. Verify Database Connection

Make sure your `.env` file has `DATABASE_URL`:

```env
DATABASE_URL=postgresql://user:password@host:port/database
```

### 3. Run ETL

**Load Top 10 States (Quick Test - ~50,000 records):**
```bash
python npi_api_etl.py --top-states
```

**Load Specific States:**
```bash
python npi_api_etl.py --states CA TX NY FL
```

**Load All 50 States (~400,000+ records):**
```bash
python npi_api_etl.py --all-states
```

**Test with Limited Records:**
```bash
python npi_api_etl.py --states CA --max-per-state 1000
```

---

## Full File ETL

### 1. Download and Process Full NPPES File

```bash
python npi_etl.py
```

This will:
1. Download the latest NPPES file (~8GB)
2. Extract and parse the CSV
3. Filter to physicians only (MD, DO, NP, PA, etc.)
4. Load ~1.1 million records to database

### Options:

**Download Only:**
```bash
python npi_etl.py --download-only
```

**Skip Download (use existing file):**
```bash
python npi_etl.py --skip-download
```

**Use Specific ZIP File:**
```bash
python npi_etl.py --zip-file ./data/NPPES_Data.zip
```

---

## Database Schema

The ETL creates a `physicians` table:

```sql
CREATE TABLE physicians (
    id SERIAL PRIMARY KEY,
    npi VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(200),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    credential VARCHAR(50),
    gender VARCHAR(1),
    specialty VARCHAR(200),
    taxonomy_code VARCHAR(20),
    address VARCHAR(200),
    address_2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(2),
    zip VARCHAR(10),
    phone VARCHAR(20),
    enumeration_date DATE,
    last_update DATE,
    is_sole_proprietor BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Indexes Created:
- `idx_physicians_name` - Search by name
- `idx_physicians_last_name` - Search by last name
- `idx_physicians_state` - Filter by state
- `idx_physicians_city` - Filter by city
- `idx_physicians_zip` - Filter by ZIP code
- `idx_physicians_specialty` - Filter by specialty
- `idx_physicians_credential` - Filter by credential
- `idx_physicians_npi` - Lookup by NPI

---

## Expected Record Counts

| Source | Records |
|--------|---------|
| API - Top 10 States | ~50,000 |
| API - All 50 States | ~400,000 |
| Full File - Physicians Only | ~1,100,000 |
| Full File - All Providers | ~7,500,000 |

---

## Sample Queries

**Search by name:**
```sql
SELECT * FROM physicians 
WHERE name ILIKE '%smith%' 
LIMIT 20;
```

**Find cardiologists in California:**
```sql
SELECT * FROM physicians 
WHERE state = 'CA' 
AND specialty ILIKE '%cardiology%'
ORDER BY city;
```

**Count by state:**
```sql
SELECT state, COUNT(*) as count 
FROM physicians 
GROUP BY state 
ORDER BY count DESC;
```

**Count by specialty:**
```sql
SELECT specialty, COUNT(*) as count 
FROM physicians 
WHERE specialty IS NOT NULL
GROUP BY specialty 
ORDER BY count DESC 
LIMIT 20;
```

---

## Scheduling (Weekly Updates)

### Windows Task Scheduler:
1. Create a batch file `run_etl.bat`:
```batch
cd C:\Users\meenketan.rathore\Documents\GitHub\healthcarenews\etl
python npi_api_etl.py --all-states
```

2. Schedule it to run weekly

### Linux/Mac Cron:
```cron
0 2 * * 0 cd /path/to/etl && python npi_api_etl.py --all-states
```

---

## Troubleshooting

### Connection Error
Make sure `DATABASE_URL` in `.env` is correct and the database is accessible.

### API Rate Limiting
The API ETL includes a 0.5 second delay between requests. If you get rate limited, increase the delay in `npi_api_etl.py`.

### Memory Issues with Full File
The full file ETL processes data in chunks. If you still have issues, reduce the `batch_size` in `load_to_database()`.

---

## Data Source

- **NPPES**: https://npiregistry.cms.hhs.gov/
- **Data Downloads**: https://download.cms.gov/nppes/NPI_Files.html
- **API Documentation**: https://npiregistry.cms.hhs.gov/api-page

Data is updated weekly by CMS.
