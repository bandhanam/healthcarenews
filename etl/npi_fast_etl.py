"""
NPI Fast ETL - Optimized for CockroachDB

Loads the full NPPES file into npi_providers (~7–9 million rows).
By default existing rows are NEVER updated (ON CONFLICT DO NOTHING); only new
NPIs are inserted. Use --upsert if you need to refresh existing records.
If you only see ~2.5M rows: the run was likely interrupted. Re-run the same
command (with --skip-download if the file is already in ./data/) and it will
resume from the last saved row. Use --no-resume to start from row 0.

Optimizations:
- Multi-row INSERT (100 rows per statement; tune ROWS_PER_INSERT / COMMIT_BATCH)
- Frequent commits (default every 500 rows) for stability on long runs
- Disabled autocommit for batch transactions
- Simplified schema for faster writes
- Progress every 10 seconds
- Optional download of full NPPES file (~8GB)
- Resume: state saved to data/npi_fast_etl_state.json; re-run to continue after interrupt

Author: Healthcare News ETL
"""

import os
import sys
import json
import requests
import zipfile
import csv
import psycopg2
from datetime import datetime
from io import TextIOWrapper
import logging
import hashlib
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('npi_fast_etl.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv('DATABASE_URL')
NPPES_BASE_URL = "https://download.cms.gov/nppes"
DATA_DIR = "./data"
STATE_FILE = os.path.join(DATA_DIR, "npi_fast_etl_state.json")

# Batch sizes (smaller = more frequent commits; safer for long runs / flaky connections)
ROWS_PER_INSERT = 100   # Rows per INSERT statement
COMMIT_BATCH = 500      # Commit after this many rows loaded (since last commit)
STATE_SAVE_INTERVAL = 500  # Save resume state every N rows (align with commit)


def get_latest_nppes_url():
    """Get URL for latest NPPES file"""
    current_date = datetime.now()
    
    for month_offset in range(0, 4):
        try_month = current_date.month - month_offset
        try_year = current_date.year
        
        if try_month <= 0:
            try_month += 12
            try_year -= 1
        
        try_date = datetime(try_year, try_month, 1)
        month_name = try_date.strftime("%B")
        filename = f"NPPES_Data_Dissemination_{month_name}_{try_year}.zip"
        url = f"{NPPES_BASE_URL}/{filename}"
        
        try:
            response = requests.head(url, timeout=10)
            if response.status_code == 200:
                logger.info(f"Found: {filename}")
                return url, filename
        except Exception:
            continue
    
    raise ValueError("No NPPES file found")


def download_file(url, filename):
    """Download NPPES file with progress. Full file is ~8GB and has ~7–9M rows."""
    os.makedirs(DATA_DIR, exist_ok=True)
    filepath = os.path.join(DATA_DIR, filename)
    
    if os.path.exists(filepath):
        try:
            response = requests.head(url, timeout=10)
            expected_size = int(response.headers.get('content-length', 0))
            actual_size = os.path.getsize(filepath)
            if expected_size > 0 and actual_size == expected_size:
                logger.info(f"File already downloaded: {filepath} ({actual_size / (1024**3):.2f} GB)")
                return filepath
        except Exception:
            pass
    
    logger.info(f"Downloading {url}... (full file ~8GB, ~7–9M rows; may take 30–60 min)")
    response = requests.get(url, stream=True, timeout=60)
    response.raise_for_status()
    total_size = int(response.headers.get('content-length', 0))
    downloaded = 0
    with open(filepath, 'wb') as f:
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            f.write(chunk)
            downloaded += len(chunk)
            if total_size > 0:
                pct = (downloaded / total_size) * 100
                sys.stdout.write(f"\rDownloading: {pct:.1f}% ({downloaded / (1024**3):.1f} GB)")
                sys.stdout.flush()
    print()
    logger.info(f"Download complete: {filepath}")
    return filepath


def load_state(zip_filepath, resume_enabled):
    """Load resume state. Returns row number to resume from (0 = start from beginning)."""
    if not resume_enabled:
        return 0
    if not zip_filepath or not os.path.exists(STATE_FILE):
        return 0
    try:
        with open(STATE_FILE, 'r') as f:
            state = json.load(f)
        # Only resume if same file
        base = os.path.basename(zip_filepath)
        if state.get('filename') != base:
            return 0
        if state.get('status') == 'completed':
            return 0
        row = int(state.get('last_processed_row', 0))
        if row > 0:
            logger.info(f"Resume: continuing from row {row:,} (use --no-resume to start fresh)")
        return row
    except Exception as e:
        logger.debug(f"Could not load state: {e}")
        return 0


def save_state(zip_filepath, row_count, status='running'):
    """Save resume state so run can be resumed after interrupt."""
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        base = os.path.basename(zip_filepath) if zip_filepath else None
        with open(STATE_FILE, 'w') as f:
            json.dump({
                'filename': base,
                'last_processed_row': row_count,
                'status': status,
                'updated_at': datetime.now().isoformat()
            }, f, indent=0)
    except Exception as e:
        logger.warning(f"Could not save state: {e}")


def create_table(conn):
    """Create optimized table"""
    with conn.cursor() as cur:
        cur.execute("""
        CREATE TABLE IF NOT EXISTS npi_providers (
            npi VARCHAR(10) PRIMARY KEY,
            entity_type VARCHAR(1),
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            credential VARCHAR(50),
            organization_name VARCHAR(200),
            address_1 VARCHAR(200),
            city VARCHAR(100),
            state VARCHAR(2),
            zip VARCHAR(10),
            phone VARCHAR(20),
            primary_taxonomy VARCHAR(20),
            last_update_date DATE,
            record_hash VARCHAR(32),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
    conn.commit()
    logger.info("Table ready")


def clean(val, max_len=None):
    """Clean string value"""
    if not val or val == '':
        return None
    val = str(val).strip()
    if max_len:
        val = val[:max_len]
    # Escape single quotes for SQL
    val = val.replace("'", "''")
    return val if val else None


def parse_date(date_str):
    """Parse date"""
    if not date_str:
        return None
    try:
        return datetime.strptime(str(date_str), '%m/%d/%Y').strftime('%Y-%m-%d')
    except:
        return None


def compute_hash(r):
    """Quick hash"""
    s = f"{r.get('last_name','')}{r.get('first_name','')}{r.get('address_1','')}{r.get('city','')}{r.get('state','')}"
    return hashlib.md5(s.encode()).hexdigest()


def transform(row):
    """Transform row"""
    r = {
        'npi': clean(row.get('NPI'), 10),
        'entity_type': clean(row.get('Entity Type Code'), 1),
        'first_name': clean(row.get('Provider First Name'), 100),
        'last_name': clean(row.get('Provider Last Name (Legal Name)'), 100),
        'credential': clean(row.get('Provider Credential Text'), 50),
        'organization_name': clean(row.get('Provider Organization Name (Legal Business Name)'), 200),
        'address_1': clean(row.get('Provider First Line Business Practice Location Address'), 200),
        'city': clean(row.get('Provider Business Practice Location Address City Name'), 100),
        'state': clean(row.get('Provider Business Practice Location Address State Name'), 2),
        'zip': clean(row.get('Provider Business Practice Location Address Postal Code'), 10),
        'phone': clean(row.get('Provider Business Practice Location Address Telephone Number'), 20),
        'primary_taxonomy': clean(row.get('Healthcare Provider Taxonomy Code_1'), 20),
        'last_update_date': parse_date(row.get('Last Update Date')),
    }
    r['record_hash'] = compute_hash(r)
    return r


def sql_value(val):
    """Format value for SQL"""
    if val is None:
        return 'NULL'
    return f"'{val}'"


def build_multi_insert(records, insert_only=False):
    """Build multi-row INSERT statement.
    insert_only=True: ON CONFLICT DO NOTHING (existing rows are never touched).
    insert_only=False: ON CONFLICT DO UPDATE (upsert).
    """
    if not records:
        return None
    
    cols = ['npi', 'entity_type', 'first_name', 'last_name', 'credential',
            'organization_name', 'address_1', 'city', 'state', 'zip',
            'phone', 'primary_taxonomy', 'last_update_date', 'record_hash']
    
    fixed_values = []
    for r in records:
        vals = [sql_value(r.get(c)) for c in cols]
        fixed_values.append(f"({', '.join(vals)}, CURRENT_TIMESTAMP)")
    
    if insert_only:
        return f"""
    INSERT INTO npi_providers ({', '.join(cols)}, updated_at)
    VALUES {', '.join(fixed_values)}
    ON CONFLICT (npi) DO NOTHING
    """
    
    return f"""
    INSERT INTO npi_providers ({', '.join(cols)}, updated_at)
    VALUES {', '.join(fixed_values)}
    ON CONFLICT (npi) DO UPDATE SET
        entity_type = EXCLUDED.entity_type,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        credential = EXCLUDED.credential,
        organization_name = EXCLUDED.organization_name,
        address_1 = EXCLUDED.address_1,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip = EXCLUDED.zip,
        phone = EXCLUDED.phone,
        primary_taxonomy = EXCLUDED.primary_taxonomy,
        last_update_date = EXCLUDED.last_update_date,
        record_hash = EXCLUDED.record_hash,
        updated_at = CURRENT_TIMESTAMP
    WHERE npi_providers.record_hash IS DISTINCT FROM EXCLUDED.record_hash
    """


def process_file(zip_filepath, conn, resume_from=0, insert_only=False):
    """Process with multi-row inserts. resume_from = row number to start from (0 = from start).
    insert_only=True: only INSERT new NPIs; ON CONFLICT DO NOTHING so existing rows are never updated.
    """
    
    logger.info(f"Processing: {zip_filepath}")
    if resume_from > 0:
        logger.info(f"Resuming from row {resume_from:,} (skipping to resume point...)")
    if insert_only:
        logger.info("Insert-only: existing rows will NOT be updated (ON CONFLICT DO NOTHING).")
    else:
        logger.info("Upsert mode: existing NPIs may be updated when data changes.")
    
    with zipfile.ZipFile(zip_filepath, 'r') as zf:
        csv_files = [f for f in zf.namelist() if 'npidata' in f.lower() and f.endswith('.csv')]
        if not csv_files:
            raise ValueError("No NPI CSV found")
        
        csv_filename = csv_files[0]
        logger.info(f"Reading: {csv_filename}")
        
        with zf.open(csv_filename) as csvfile:
            reader = csv.DictReader(TextIOWrapper(csvfile, encoding='utf-8', errors='replace'))
            
            batch = []
            row_count = 0
            loaded = 0
            rows_since_commit = 0
            start_time = datetime.now()
            last_log = start_time
            last_state_save = 0
            
            cur = conn.cursor()
            
            for row in reader:
                row_count += 1
                
                # Skip rows when resuming
                if row_count <= resume_from:
                    if resume_from > 0 and row_count % 500000 == 0:
                        logger.info(f"Skipping to resume point... {row_count:,} / {resume_from:,}")
                    continue
                
                try:
                    record = transform(row)
                    if not record['npi']:
                        continue
                    batch.append(record)
                except Exception:
                    continue
                
                # Multi-row insert
                if len(batch) >= ROWS_PER_INSERT:
                    sql = build_multi_insert(batch, insert_only=insert_only)
                    n = len(batch)
                    try:
                        cur.execute(sql)
                        loaded += n
                        rows_since_commit += n
                    except Exception:
                        # Fallback to individual inserts on error
                        for r in batch:
                            try:
                                cur.execute(build_multi_insert([r], insert_only=insert_only))
                                loaded += 1
                                rows_since_commit += 1
                            except Exception:
                                pass
                    batch = []
                    
                    # Commit every COMMIT_BATCH rows (reliable regardless of ROWS_PER_INSERT)
                    if rows_since_commit >= COMMIT_BATCH:
                        conn.commit()
                        rows_since_commit = 0
                    
                    # Save resume state
                    if row_count - last_state_save >= STATE_SAVE_INTERVAL:
                        save_state(zip_filepath, row_count, 'running')
                        last_state_save = row_count
                
                # Progress
                now = datetime.now()
                if (now - last_log).total_seconds() >= 10:
                    elapsed = (now - start_time).total_seconds()
                    rows_done = row_count - resume_from
                    rate = rows_done / elapsed if elapsed > 0 else 0
                    eta = (9000000 - row_count) / rate / 60 if rate > 0 else 0
                    logger.info(
                        f"Rows: {row_count:,} | Loaded: {loaded:,} | "
                        f"Rate: {rate:,.0f}/sec | ETA: {eta:.0f} min"
                    )
                    last_log = now
            
            # Final batch
            if batch:
                try:
                    cur.execute(build_multi_insert(batch, insert_only=insert_only))
                    n = len(batch)
                    loaded += n
                    rows_since_commit += n
                except Exception:
                    pass
            
            conn.commit()
            cur.close()
            
            # Mark completed so next run starts fresh
            save_state(zip_filepath, row_count, 'completed')
            
            elapsed = (datetime.now() - start_time).total_seconds()
            logger.info("=" * 50)
            logger.info("ETL COMPLETE!")
            logger.info(f"Total Rows: {row_count:,}")
            logger.info(f"Loaded: {loaded:,}")
            logger.info(f"Time: {elapsed/60:.1f} min")
            logger.info(f"Rate: {row_count/elapsed:,.0f}/sec")
            if loaded < 5_000_000:
                logger.info("NOTE: Full NPPES has ~7–9M rows. If you expected more, re-run without --skip-download to use the full file.")
            logger.info("=" * 50)


def run_etl(skip_download=False, resume=True, incremental=False, allow_updates=False):
    """Main entry point. resume=True: continue from last saved row if same file.
    incremental=True: same as skip_download + resume (use existing file, resume from state).
    allow_updates=False (default): never update existing rows (ON CONFLICT DO NOTHING).
    allow_updates=True (--upsert): upsert when NPI exists (may change existing data).
    """
    if incremental:
        skip_download = True
        resume = True
        logger.info("Incremental load: using existing file; will resume from last position if state exists.")
    
    logger.info("=" * 50)
    logger.info("NPI FAST ETL")
    logger.info(f"Insert batch: {ROWS_PER_INSERT}")
    logger.info(f"Commit batch: {COMMIT_BATCH}")
    logger.info(f"Resume: {'enabled (use --no-resume to start fresh)' if resume else 'disabled'}")
    logger.info(f"Existing rows: {'may be UPDATED (--upsert)' if allow_updates else 'NOT touched (insert new NPIs only)'}")
    if skip_download:
        logger.info("Mode: incremental (existing file in ./data/)")
    logger.info("=" * 50)
    
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    
    try:
        create_table(conn)
        
        if skip_download:
            files = [f for f in os.listdir(DATA_DIR) if 'NPPES' in f and f.endswith('.zip')]
            if not files:
                raise ValueError("No file found in ./data/. Run without --skip-download to download.")
            zip_filepath = os.path.join(DATA_DIR, sorted(files)[-1])
        else:
            url, filename = get_latest_nppes_url()
            zip_filepath = download_file(url, filename)
        
        logger.info(f"Using: {zip_filepath}")
        resume_from = load_state(zip_filepath, resume)
        # Default: never update existing rows (ON CONFLICT DO NOTHING). Use --upsert to allow updates.
        insert_only = not allow_updates
        process_file(zip_filepath, conn, resume_from=resume_from, insert_only=insert_only)
        
        # Stats
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM npi_providers")
            logger.info(f"Total in DB: {cur.fetchone()[0]:,}")
        
    finally:
        conn.close()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='NPI Fast ETL with resume support')
    parser.add_argument('--skip-download', action='store_true', help='Use existing zip in ./data/ (incremental load)')
    parser.add_argument('--incremental', action='store_true', help='Incremental load: use existing file, resume from last position')
    parser.add_argument('--no-resume', action='store_true', help='Start from row 0 (ignore saved state)')
    parser.add_argument('--upsert', action='store_true', help='Allow updating existing NPIs (default: insert new only, never touch existing)')
    args = parser.parse_args()
    run_etl(
        skip_download=args.skip_download or args.incremental,
        resume=not args.no_resume,
        incremental=args.incremental,
        allow_updates=args.upsert,
    )
