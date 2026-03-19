"""
NPI Full ETL - Load ALL 7.5 Million Providers from NPPES

Features:
- Downloads full NPPES file (~8 GB)
- Loads ALL providers (not just physicians)
- Incremental load support (only updates changed records)
- Resume capability (can restart if interrupted)
- Progress tracking
- Batch processing for memory efficiency

Author: Healthcare News ETL
Date: 2026
"""

import os
import sys
import requests
import zipfile
import csv
import psycopg2
from psycopg2.extras import execute_batch
from datetime import datetime
from io import TextIOWrapper
import logging
import hashlib
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('npi_full_etl.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration
DATABASE_URL = os.getenv('DATABASE_URL')
NPPES_BASE_URL = "https://download.cms.gov/nppes"
DATA_DIR = "./data"
STATE_FILE = "./data/etl_state.json"

# Batch size for database inserts
BATCH_SIZE = 5000


def get_latest_nppes_url():
    """Get URL for latest NPPES full file"""
    current_date = datetime.now()
    
    # Try current month, then previous months
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
        
        logger.info(f"Checking: {url}")
        
        try:
            response = requests.head(url, timeout=10)
            if response.status_code == 200:
                return url, filename
        except Exception as e:
            logger.debug(f"URL not available: {e}")
            continue
    
    raise ValueError("Could not find NPPES download file")


def download_file(url, filename):
    """Download NPPES file with progress and resume support"""
    os.makedirs(DATA_DIR, exist_ok=True)
    filepath = os.path.join(DATA_DIR, filename)
    
    # Check if file already exists and is complete
    if os.path.exists(filepath):
        # Verify file size
        response = requests.head(url, timeout=10)
        expected_size = int(response.headers.get('content-length', 0))
        actual_size = os.path.getsize(filepath)
        
        if actual_size == expected_size:
            logger.info(f"File already downloaded: {filepath} ({actual_size / (1024**3):.2f} GB)")
            return filepath
        else:
            logger.info(f"Incomplete file detected. Re-downloading...")
    
    logger.info(f"Downloading {url}...")
    logger.info("This will take 30-60 minutes depending on your connection...")
    
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    total_size = int(response.headers.get('content-length', 0))
    downloaded = 0
    start_time = datetime.now()
    
    with open(filepath, 'wb') as f:
        for chunk in response.iter_content(chunk_size=1024 * 1024):  # 1MB chunks
            f.write(chunk)
            downloaded += len(chunk)
            
            # Progress indicator
            if total_size > 0:
                percent = (downloaded / total_size) * 100
                downloaded_gb = downloaded / (1024**3)
                total_gb = total_size / (1024**3)
                elapsed = (datetime.now() - start_time).total_seconds()
                speed = downloaded / (1024**2) / elapsed if elapsed > 0 else 0
                eta = (total_size - downloaded) / (speed * 1024**2) / 60 if speed > 0 else 0
                
                sys.stdout.write(f"\rDownloading: {percent:.1f}% ({downloaded_gb:.2f}/{total_gb:.2f} GB) "
                               f"Speed: {speed:.1f} MB/s ETA: {eta:.0f} min")
                sys.stdout.flush()
    
    print()
    logger.info(f"Download complete: {filepath}")
    return filepath


def create_database_tables(conn):
    """Create tables for full NPI data"""
    
    # Main providers table
    create_providers_sql = """
    CREATE TABLE IF NOT EXISTS npi_providers (
        npi VARCHAR(10) PRIMARY KEY,
        entity_type VARCHAR(1),
        
        -- Individual fields
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        middle_name VARCHAR(100),
        prefix VARCHAR(20),
        suffix VARCHAR(20),
        credential VARCHAR(50),
        gender VARCHAR(1),
        
        -- Organization fields
        organization_name VARCHAR(200),
        other_organization_name VARCHAR(200),
        
        -- Primary practice address
        address_1 VARCHAR(200),
        address_2 VARCHAR(200),
        city VARCHAR(100),
        state VARCHAR(2),
        zip VARCHAR(10),
        country VARCHAR(2),
        phone VARCHAR(20),
        fax VARCHAR(20),
        
        -- Mailing address
        mail_address_1 VARCHAR(200),
        mail_address_2 VARCHAR(200),
        mail_city VARCHAR(100),
        mail_state VARCHAR(2),
        mail_zip VARCHAR(10),
        mail_country VARCHAR(2),
        mail_phone VARCHAR(20),
        mail_fax VARCHAR(20),
        
        -- Taxonomy (specialty)
        primary_taxonomy VARCHAR(20),
        primary_taxonomy_desc VARCHAR(200),
        taxonomy_2 VARCHAR(20),
        taxonomy_3 VARCHAR(20),
        
        -- Other info
        enumeration_date DATE,
        last_update_date DATE,
        deactivation_date DATE,
        reactivation_date DATE,
        is_sole_proprietor BOOLEAN DEFAULT FALSE,
        is_organization_subpart BOOLEAN DEFAULT FALSE,
        
        -- ETL metadata
        record_hash VARCHAR(64),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    
    # Create indexes
    create_indexes_sql = """
    CREATE INDEX IF NOT EXISTS idx_npi_providers_name ON npi_providers(last_name, first_name);
    CREATE INDEX IF NOT EXISTS idx_npi_providers_org ON npi_providers(organization_name);
    CREATE INDEX IF NOT EXISTS idx_npi_providers_state ON npi_providers(state);
    CREATE INDEX IF NOT EXISTS idx_npi_providers_city ON npi_providers(city);
    CREATE INDEX IF NOT EXISTS idx_npi_providers_zip ON npi_providers(zip);
    CREATE INDEX IF NOT EXISTS idx_npi_providers_taxonomy ON npi_providers(primary_taxonomy);
    CREATE INDEX IF NOT EXISTS idx_npi_providers_entity ON npi_providers(entity_type);
    CREATE INDEX IF NOT EXISTS idx_npi_providers_credential ON npi_providers(credential);
    CREATE INDEX IF NOT EXISTS idx_npi_providers_updated ON npi_providers(last_update_date);
    """
    
    # ETL state table
    create_state_sql = """
    CREATE TABLE IF NOT EXISTS etl_state (
        id VARCHAR(50) PRIMARY KEY,
        last_file VARCHAR(200),
        last_processed_row BIGINT DEFAULT 0,
        total_rows BIGINT DEFAULT 0,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending'
    );
    """
    
    with conn.cursor() as cur:
        logger.info("Creating providers table...")
        cur.execute(create_providers_sql)
        
        logger.info("Creating indexes...")
        cur.execute(create_indexes_sql)
        
        logger.info("Creating ETL state table...")
        cur.execute(create_state_sql)
    
    conn.commit()
    logger.info("Database tables ready")


def clean_phone(phone):
    """Clean and format phone number"""
    if not phone:
        return None
    digits = ''.join(c for c in str(phone) if c.isdigit())
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    elif len(digits) == 11 and digits[0] == '1':
        return f"({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
    return phone[:20] if phone else None


def clean_string(s, max_len=None):
    """Clean string value"""
    if not s or s == '':
        return None
    s = str(s).strip()
    if max_len:
        s = s[:max_len]
    return s if s else None


def parse_date(date_str):
    """Parse date string to date object"""
    if not date_str:
        return None
    try:
        return datetime.strptime(str(date_str), '%m/%d/%Y').date()
    except:
        try:
            return datetime.strptime(str(date_str), '%Y-%m-%d').date()
        except:
            return None


def compute_record_hash(record):
    """Compute hash of record for change detection"""
    # Create string from key fields
    hash_str = '|'.join([
        str(record.get('last_name', '')),
        str(record.get('first_name', '')),
        str(record.get('organization_name', '')),
        str(record.get('address_1', '')),
        str(record.get('city', '')),
        str(record.get('state', '')),
        str(record.get('zip', '')),
        str(record.get('phone', '')),
        str(record.get('primary_taxonomy', '')),
        str(record.get('last_update_date', '')),
    ])
    return hashlib.md5(hash_str.encode()).hexdigest()


def transform_row(row):
    """Transform CSV row to database record"""
    entity_type = row.get('Entity Type Code', '')
    
    record = {
        'npi': clean_string(row.get('NPI'), 10),
        'entity_type': clean_string(entity_type, 1),
        
        # Individual fields (Entity Type = 1)
        'first_name': clean_string(row.get('Provider First Name'), 100),
        'last_name': clean_string(row.get('Provider Last Name (Legal Name)'), 100),
        'middle_name': clean_string(row.get('Provider Middle Name'), 100),
        'prefix': clean_string(row.get('Provider Name Prefix Text'), 20),
        'suffix': clean_string(row.get('Provider Name Suffix Text'), 20),
        'credential': clean_string(row.get('Provider Credential Text'), 50),
        'gender': clean_string(row.get('Provider Gender Code'), 1),
        
        # Organization fields (Entity Type = 2)
        'organization_name': clean_string(row.get('Provider Organization Name (Legal Business Name)'), 200),
        'other_organization_name': clean_string(row.get('Provider Other Organization Name'), 200),
        
        # Primary practice address
        'address_1': clean_string(row.get('Provider First Line Business Practice Location Address'), 200),
        'address_2': clean_string(row.get('Provider Second Line Business Practice Location Address'), 200),
        'city': clean_string(row.get('Provider Business Practice Location Address City Name'), 100),
        'state': clean_string(row.get('Provider Business Practice Location Address State Name'), 2),
        'zip': clean_string(row.get('Provider Business Practice Location Address Postal Code'), 10),
        'country': clean_string(row.get('Provider Business Practice Location Address Country Code (If outside U.S.)'), 2),
        'phone': clean_phone(row.get('Provider Business Practice Location Address Telephone Number')),
        'fax': clean_phone(row.get('Provider Business Practice Location Address Fax Number')),
        
        # Mailing address
        'mail_address_1': clean_string(row.get('Provider First Line Business Mailing Address'), 200),
        'mail_address_2': clean_string(row.get('Provider Second Line Business Mailing Address'), 200),
        'mail_city': clean_string(row.get('Provider Business Mailing Address City Name'), 100),
        'mail_state': clean_string(row.get('Provider Business Mailing Address State Name'), 2),
        'mail_zip': clean_string(row.get('Provider Business Mailing Address Postal Code'), 10),
        'mail_country': clean_string(row.get('Provider Business Mailing Address Country Code (If outside U.S.)'), 2),
        'mail_phone': clean_phone(row.get('Provider Business Mailing Address Telephone Number')),
        'mail_fax': clean_phone(row.get('Provider Business Mailing Address Fax Number')),
        
        # Primary taxonomy
        'primary_taxonomy': clean_string(row.get('Healthcare Provider Taxonomy Code_1'), 20),
        'primary_taxonomy_desc': None,  # We'll add this later
        'taxonomy_2': clean_string(row.get('Healthcare Provider Taxonomy Code_2'), 20),
        'taxonomy_3': clean_string(row.get('Healthcare Provider Taxonomy Code_3'), 20),
        
        # Dates
        'enumeration_date': parse_date(row.get('Provider Enumeration Date')),
        'last_update_date': parse_date(row.get('Last Update Date')),
        'deactivation_date': parse_date(row.get('NPI Deactivation Date')),
        'reactivation_date': parse_date(row.get('NPI Reactivation Date')),
        
        # Flags
        'is_sole_proprietor': row.get('Is Sole Proprietor') == 'Y',
        'is_organization_subpart': row.get('Is Organization Subpart') == 'Y',
    }
    
    # Compute hash for incremental detection
    record['record_hash'] = compute_record_hash(record)
    
    return record


def get_etl_state(conn, etl_id):
    """Get current ETL state for resume capability"""
    with conn.cursor() as cur:
        cur.execute("SELECT last_processed_row, status FROM etl_state WHERE id = %s", (etl_id,))
        result = cur.fetchone()
        if result:
            return {'last_processed_row': result[0], 'status': result[1]}
    return None


def update_etl_state(conn, etl_id, row_num, status='running', total_rows=None, filename=None):
    """Update ETL state for resume capability"""
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO etl_state (id, last_file, last_processed_row, total_rows, started_at, status)
            VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, %s)
            ON CONFLICT (id) DO UPDATE SET
                last_processed_row = EXCLUDED.last_processed_row,
                total_rows = COALESCE(EXCLUDED.total_rows, etl_state.total_rows),
                status = EXCLUDED.status,
                completed_at = CASE WHEN EXCLUDED.status = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END
        """, (etl_id, filename, row_num, total_rows, status))
    conn.commit()


def load_batch_to_database(conn, records):
    """Load batch of records using upsert with change detection"""
    
    upsert_sql = """
    INSERT INTO npi_providers (
        npi, entity_type, first_name, last_name, middle_name, prefix, suffix,
        credential, gender, organization_name, other_organization_name,
        address_1, address_2, city, state, zip, country, phone, fax,
        mail_address_1, mail_address_2, mail_city, mail_state, mail_zip, mail_country, mail_phone, mail_fax,
        primary_taxonomy, primary_taxonomy_desc, taxonomy_2, taxonomy_3,
        enumeration_date, last_update_date, deactivation_date, reactivation_date,
        is_sole_proprietor, is_organization_subpart, record_hash, updated_at
    ) VALUES (
        %(npi)s, %(entity_type)s, %(first_name)s, %(last_name)s, %(middle_name)s, %(prefix)s, %(suffix)s,
        %(credential)s, %(gender)s, %(organization_name)s, %(other_organization_name)s,
        %(address_1)s, %(address_2)s, %(city)s, %(state)s, %(zip)s, %(country)s, %(phone)s, %(fax)s,
        %(mail_address_1)s, %(mail_address_2)s, %(mail_city)s, %(mail_state)s, %(mail_zip)s, %(mail_country)s, %(mail_phone)s, %(mail_fax)s,
        %(primary_taxonomy)s, %(primary_taxonomy_desc)s, %(taxonomy_2)s, %(taxonomy_3)s,
        %(enumeration_date)s, %(last_update_date)s, %(deactivation_date)s, %(reactivation_date)s,
        %(is_sole_proprietor)s, %(is_organization_subpart)s, %(record_hash)s, CURRENT_TIMESTAMP
    )
    ON CONFLICT (npi) DO UPDATE SET
        entity_type = EXCLUDED.entity_type,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        middle_name = EXCLUDED.middle_name,
        prefix = EXCLUDED.prefix,
        suffix = EXCLUDED.suffix,
        credential = EXCLUDED.credential,
        gender = EXCLUDED.gender,
        organization_name = EXCLUDED.organization_name,
        other_organization_name = EXCLUDED.other_organization_name,
        address_1 = EXCLUDED.address_1,
        address_2 = EXCLUDED.address_2,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip = EXCLUDED.zip,
        country = EXCLUDED.country,
        phone = EXCLUDED.phone,
        fax = EXCLUDED.fax,
        mail_address_1 = EXCLUDED.mail_address_1,
        mail_address_2 = EXCLUDED.mail_address_2,
        mail_city = EXCLUDED.mail_city,
        mail_state = EXCLUDED.mail_state,
        mail_zip = EXCLUDED.mail_zip,
        mail_country = EXCLUDED.mail_country,
        mail_phone = EXCLUDED.mail_phone,
        mail_fax = EXCLUDED.mail_fax,
        primary_taxonomy = EXCLUDED.primary_taxonomy,
        primary_taxonomy_desc = EXCLUDED.primary_taxonomy_desc,
        taxonomy_2 = EXCLUDED.taxonomy_2,
        taxonomy_3 = EXCLUDED.taxonomy_3,
        enumeration_date = EXCLUDED.enumeration_date,
        last_update_date = EXCLUDED.last_update_date,
        deactivation_date = EXCLUDED.deactivation_date,
        reactivation_date = EXCLUDED.reactivation_date,
        is_sole_proprietor = EXCLUDED.is_sole_proprietor,
        is_organization_subpart = EXCLUDED.is_organization_subpart,
        record_hash = EXCLUDED.record_hash,
        updated_at = CURRENT_TIMESTAMP
    WHERE npi_providers.record_hash IS DISTINCT FROM EXCLUDED.record_hash
    """
    
    with conn.cursor() as cur:
        execute_batch(cur, upsert_sql, records, page_size=1000)
    conn.commit()


def process_nppes_file(zip_filepath, conn, resume_from=0):
    """Process NPPES ZIP file and load to database"""
    
    etl_id = f"nppes_full_{datetime.now().strftime('%Y%m')}"
    
    logger.info(f"Opening ZIP file: {zip_filepath}")
    
    with zipfile.ZipFile(zip_filepath, 'r') as zf:
        # Find the main NPI data file
        csv_files = [f for f in zf.namelist() if f.lower().endswith('.csv') and 'npidata' in f.lower()]
        
        if not csv_files:
            raise ValueError("No NPI data CSV found in ZIP file")
        
        csv_filename = csv_files[0]
        logger.info(f"Processing: {csv_filename}")
        
        with zf.open(csv_filename) as csvfile:
            text_file = TextIOWrapper(csvfile, encoding='utf-8', errors='replace')
            reader = csv.DictReader(text_file)
            
            batch = []
            row_count = 0
            loaded_count = 0
            skipped_count = 0
            start_time = datetime.now()
            last_log_time = start_time
            
            logger.info(f"Starting from row {resume_from}...")
            
            for row in reader:
                row_count += 1
                
                # Skip rows if resuming
                if row_count <= resume_from:
                    if row_count % 500000 == 0:
                        logger.info(f"Skipping to resume point... {row_count:,} / {resume_from:,}")
                    continue
                
                # Transform row
                try:
                    record = transform_row(row)
                    
                    # Skip records without NPI
                    if not record['npi']:
                        skipped_count += 1
                        continue
                    
                    batch.append(record)
                    
                except Exception as e:
                    logger.warning(f"Error processing row {row_count}: {e}")
                    skipped_count += 1
                    continue
                
                # Load batch
                if len(batch) >= BATCH_SIZE:
                    load_batch_to_database(conn, batch)
                    loaded_count += len(batch)
                    batch = []
                    
                    # Update ETL state
                    update_etl_state(conn, etl_id, row_count, 'running', filename=zip_filepath)
                    
                    # Progress logging every 30 seconds
                    now = datetime.now()
                    if (now - last_log_time).total_seconds() >= 30:
                        elapsed = (now - start_time).total_seconds()
                        rate = (row_count - resume_from) / elapsed if elapsed > 0 else 0
                        eta_seconds = (7500000 - row_count) / rate if rate > 0 else 0
                        eta_minutes = eta_seconds / 60
                        
                        logger.info(
                            f"Progress: {row_count:,} rows processed | "
                            f"{loaded_count:,} loaded | "
                            f"{skipped_count:,} skipped | "
                            f"Rate: {rate:.0f}/sec | "
                            f"ETA: {eta_minutes:.0f} min"
                        )
                        last_log_time = now
            
            # Load remaining batch
            if batch:
                load_batch_to_database(conn, batch)
                loaded_count += len(batch)
            
            # Mark ETL as completed
            update_etl_state(conn, etl_id, row_count, 'completed', total_rows=row_count, filename=zip_filepath)
            
            elapsed = (datetime.now() - start_time).total_seconds()
            
            logger.info("=" * 60)
            logger.info("ETL COMPLETE!")
            logger.info("=" * 60)
            logger.info(f"Total rows processed: {row_count:,}")
            logger.info(f"Records loaded: {loaded_count:,}")
            logger.info(f"Records skipped: {skipped_count:,}")
            logger.info(f"Time elapsed: {elapsed/60:.1f} minutes")
            logger.info(f"Average rate: {row_count/elapsed:.0f} records/second")
            
            return loaded_count


def get_database_stats(conn):
    """Get current database statistics"""
    stats = {}
    
    with conn.cursor() as cur:
        # Total count
        cur.execute("SELECT COUNT(*) FROM npi_providers")
        stats['total'] = cur.fetchone()[0]
        
        # By entity type
        cur.execute("""
            SELECT 
                CASE entity_type 
                    WHEN '1' THEN 'Individual'
                    WHEN '2' THEN 'Organization'
                    ELSE 'Unknown'
                END as type,
                COUNT(*) 
            FROM npi_providers 
            GROUP BY entity_type
        """)
        stats['by_entity'] = cur.fetchall()
        
        # By state (top 10)
        cur.execute("""
            SELECT state, COUNT(*) as cnt 
            FROM npi_providers 
            WHERE state IS NOT NULL 
            GROUP BY state 
            ORDER BY cnt DESC 
            LIMIT 10
        """)
        stats['by_state'] = cur.fetchall()
        
        # By credential (top 10)
        cur.execute("""
            SELECT credential, COUNT(*) as cnt 
            FROM npi_providers 
            WHERE credential IS NOT NULL AND credential != ''
            GROUP BY credential 
            ORDER BY cnt DESC 
            LIMIT 10
        """)
        stats['by_credential'] = cur.fetchall()
    
    return stats


def run_full_etl(skip_download=False, force_restart=False):
    """Run the full ETL pipeline"""
    
    logger.info("=" * 60)
    logger.info("  NPI FULL ETL - 7.5 Million Providers")
    logger.info("=" * 60)
    
    start_time = datetime.now()
    
    # Connect to database
    logger.info("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    
    try:
        # Create tables
        create_database_tables(conn)
        
        # Get or download file
        if skip_download:
            # Find existing file
            files = [f for f in os.listdir(DATA_DIR) if f.endswith('.zip') and 'NPPES' in f] if os.path.exists(DATA_DIR) else []
            if not files:
                raise ValueError("No NPPES ZIP file found. Remove --skip-download flag.")
            zip_filepath = os.path.join(DATA_DIR, sorted(files)[-1])
            logger.info(f"Using existing file: {zip_filepath}")
        else:
            url, filename = get_latest_nppes_url()
            zip_filepath = download_file(url, filename)
        
        # Check for resume
        etl_id = f"nppes_full_{datetime.now().strftime('%Y%m')}"
        etl_state = get_etl_state(conn, etl_id)
        
        resume_from = 0
        if etl_state and not force_restart:
            if etl_state['status'] == 'completed':
                logger.info("ETL already completed for this month. Use --force-restart to reload.")
                resume_from = 0
            elif etl_state['last_processed_row'] > 0:
                logger.info(f"Resuming from row {etl_state['last_processed_row']:,}")
                resume_from = etl_state['last_processed_row']
        
        # Process file
        loaded = process_nppes_file(zip_filepath, conn, resume_from)
        
        # Show final stats
        logger.info("\n" + "=" * 60)
        logger.info("  FINAL DATABASE STATISTICS")
        logger.info("=" * 60)
        
        stats = get_database_stats(conn)
        
        logger.info(f"\nTotal Providers: {stats['total']:,}")
        
        logger.info("\nBy Entity Type:")
        for entity, count in stats['by_entity']:
            logger.info(f"  {entity}: {count:,}")
        
        logger.info("\nTop 10 States:")
        for state, count in stats['by_state']:
            logger.info(f"  {state}: {count:,}")
        
        logger.info("\nTop 10 Credentials:")
        for credential, count in stats['by_credential']:
            logger.info(f"  {credential}: {count:,}")
        
        total_time = (datetime.now() - start_time).total_seconds() / 60
        logger.info(f"\nTotal ETL Time: {total_time:.1f} minutes")
        
    finally:
        conn.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='NPI Full ETL - Load all 7.5M providers')
    parser.add_argument('--skip-download', action='store_true', help='Skip download, use existing file')
    parser.add_argument('--force-restart', action='store_true', help='Force restart (ignore resume state)')
    
    args = parser.parse_args()
    
    run_full_etl(
        skip_download=args.skip_download,
        force_restart=args.force_restart
    )
