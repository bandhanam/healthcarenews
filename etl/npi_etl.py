"""
NPI ETL - Extract, Transform, Load Physician Data from NPPES

This script:
1. Downloads the NPPES data file from CMS
2. Extracts and parses only Physician data (MD, DO, NP, PA)
3. Cleans and transforms the data
4. Loads into CockroachDB/PostgreSQL

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
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('npi_etl.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration
DATABASE_URL = os.getenv('DATABASE_URL')
NPPES_BASE_URL = "https://download.cms.gov/nppes"

# Physician-related taxonomy codes (MD, DO, NP, PA, etc.)
PHYSICIAN_TAXONOMY_PREFIXES = [
    '207',  # Allopathic & Osteopathic Physicians
    '208',  # Allopathic & Osteopathic Physicians
    '363',  # Nurse Practitioners
    '364',  # Physician Assistants
    '261Q',  # Clinics
    '174',  # Other physicians
]

# Credential filters (only include these)
PHYSICIAN_CREDENTIALS = [
    'MD', 'M.D.', 'DO', 'D.O.', 'NP', 'N.P.', 'PA', 'P.A.',
    'PA-C', 'APRN', 'DNP', 'MBBS', 'DPM', 'OD', 'DDS', 'DMD'
]


def get_latest_nppes_file():
    """Get the URL for the latest NPPES full data file"""
    current_month = datetime.now().strftime("%B")
    current_year = datetime.now().year
    
    # Try current month first, then previous months
    for month_offset in range(0, 3):
        try_date = datetime.now().replace(day=1)
        for _ in range(month_offset):
            try_date = try_date.replace(month=try_date.month - 1 if try_date.month > 1 else 12)
        
        month_name = try_date.strftime("%B")
        year = try_date.year
        
        filename = f"NPPES_Data_Dissemination_{month_name}_{year}.zip"
        url = f"{NPPES_BASE_URL}/{filename}"
        
        logger.info(f"Checking for: {url}")
        
        try:
            response = requests.head(url, timeout=10)
            if response.status_code == 200:
                return url, filename
        except:
            continue
    
    # Fallback to weekly update file
    return f"{NPPES_BASE_URL}/NPPES_Data_Dissemination_Weekly.zip", "NPPES_Data_Dissemination_Weekly.zip"


def download_nppes_file(url, filename, output_dir="./data"):
    """Download the NPPES ZIP file with progress indicator"""
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, filename)
    
    if os.path.exists(filepath):
        logger.info(f"File already exists: {filepath}")
        return filepath
    
    logger.info(f"Downloading {url}...")
    
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    total_size = int(response.headers.get('content-length', 0))
    downloaded = 0
    
    with open(filepath, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
            downloaded += len(chunk)
            if total_size > 0:
                percent = (downloaded / total_size) * 100
                sys.stdout.write(f"\rDownloading: {percent:.1f}% ({downloaded / (1024*1024):.1f} MB)")
                sys.stdout.flush()
    
    print()  # New line after progress
    logger.info(f"Download complete: {filepath}")
    return filepath


def is_physician(row, taxonomy_cols):
    """Check if the provider is a physician based on taxonomy and credentials"""
    # Check credentials
    credential = (row.get('Credential') or '').upper().strip()
    if credential:
        for valid_cred in PHYSICIAN_CREDENTIALS:
            if valid_cred.upper() in credential:
                return True
    
    # Check taxonomy codes
    for col in taxonomy_cols:
        taxonomy = row.get(col, '')
        if taxonomy:
            for prefix in PHYSICIAN_TAXONOMY_PREFIXES:
                if taxonomy.startswith(prefix):
                    return True
    
    return False


def clean_phone(phone):
    """Clean and format phone number"""
    if not phone:
        return None
    # Remove non-digits
    digits = ''.join(c for c in phone if c.isdigit())
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    elif len(digits) == 11 and digits[0] == '1':
        return f"({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
    return phone[:20] if phone else None


def clean_name(first, last, middle=None):
    """Clean and format provider name"""
    parts = []
    if first:
        parts.append(first.strip().title())
    if middle:
        parts.append(middle.strip().title())
    if last:
        parts.append(last.strip().title())
    return ' '.join(parts) if parts else None


def parse_nppes_csv(zip_filepath):
    """Parse NPPES CSV and yield cleaned physician records"""
    logger.info(f"Opening ZIP file: {zip_filepath}")
    
    with zipfile.ZipFile(zip_filepath, 'r') as zf:
        # Find the main NPI data file
        csv_files = [f for f in zf.namelist() if f.lower().endswith('.csv') and 'npidata' in f.lower()]
        
        if not csv_files:
            raise ValueError("No NPI data CSV found in ZIP file")
        
        csv_filename = csv_files[0]
        logger.info(f"Processing: {csv_filename}")
        
        with zf.open(csv_filename) as csvfile:
            # Wrap in TextIOWrapper for proper text handling
            text_file = TextIOWrapper(csvfile, encoding='utf-8', errors='replace')
            reader = csv.DictReader(text_file)
            
            # Get taxonomy column names
            taxonomy_cols = [col for col in reader.fieldnames if 'Healthcare Provider Taxonomy Code' in col]
            
            record_count = 0
            physician_count = 0
            
            for row in reader:
                record_count += 1
                
                # Progress indicator
                if record_count % 100000 == 0:
                    logger.info(f"Processed {record_count:,} records, found {physician_count:,} physicians")
                
                # Only process individual providers (Entity Type Code = 1)
                if row.get('Entity Type Code') != '1':
                    continue
                
                # Check if physician
                if not is_physician(row, taxonomy_cols):
                    continue
                
                physician_count += 1
                
                # Extract and clean data
                record = {
                    'npi': row.get('NPI', '').strip(),
                    'name': clean_name(
                        row.get('Provider First Name'),
                        row.get('Provider Last Name (Legal Name)'),
                        row.get('Provider Middle Name')
                    ),
                    'first_name': (row.get('Provider First Name') or '').strip().title(),
                    'last_name': (row.get('Provider Last Name (Legal Name)') or '').strip().title(),
                    'credential': (row.get('Credential') or '').strip().upper()[:50],
                    'gender': (row.get('Provider Gender Code') or '').strip().upper()[:1],
                    
                    # Primary practice address
                    'address': (row.get('Provider First Line Business Practice Location Address') or '').strip()[:200],
                    'address_2': (row.get('Provider Second Line Business Practice Location Address') or '').strip()[:200],
                    'city': (row.get('Provider Business Practice Location Address City Name') or '').strip().title()[:100],
                    'state': (row.get('Provider Business Practice Location Address State Name') or '').strip().upper()[:2],
                    'zip': (row.get('Provider Business Practice Location Address Postal Code') or '').strip()[:10],
                    'phone': clean_phone(row.get('Provider Business Practice Location Address Telephone Number')),
                    
                    # Specialty (first taxonomy description)
                    'specialty': None,
                    'taxonomy_code': None,
                    
                    # Additional info
                    'enumeration_date': row.get('Provider Enumeration Date'),
                    'last_update': row.get('Last Update Date'),
                    'is_sole_proprietor': row.get('Is Sole Proprietor') == 'Y',
                }
                
                # Get primary specialty
                for col in taxonomy_cols:
                    tax_code = row.get(col, '').strip()
                    if tax_code:
                        record['taxonomy_code'] = tax_code
                        # Get description from corresponding column
                        desc_col = col.replace('Code', 'Description').replace('_', ' ')
                        for dc in reader.fieldnames:
                            if 'Taxonomy' in dc and 'Desc' in dc:
                                desc = row.get(dc, '').strip()
                                if desc:
                                    record['specialty'] = desc[:200]
                                    break
                        break
                
                # Skip records without essential data
                if not record['npi'] or not record['name']:
                    continue
                
                yield record
            
            logger.info(f"Total records processed: {record_count:,}")
            logger.info(f"Total physicians found: {physician_count:,}")


def create_database_table(conn):
    """Create the physicians table if it doesn't exist"""
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS physicians (
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
        is_sole_proprietor BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create indexes for fast searching
    CREATE INDEX IF NOT EXISTS idx_physicians_name ON physicians(name);
    CREATE INDEX IF NOT EXISTS idx_physicians_last_name ON physicians(last_name);
    CREATE INDEX IF NOT EXISTS idx_physicians_state ON physicians(state);
    CREATE INDEX IF NOT EXISTS idx_physicians_city ON physicians(city);
    CREATE INDEX IF NOT EXISTS idx_physicians_zip ON physicians(zip);
    CREATE INDEX IF NOT EXISTS idx_physicians_specialty ON physicians(specialty);
    CREATE INDEX IF NOT EXISTS idx_physicians_credential ON physicians(credential);
    CREATE INDEX IF NOT EXISTS idx_physicians_npi ON physicians(npi);
    """
    
    with conn.cursor() as cur:
        cur.execute(create_table_sql)
    conn.commit()
    logger.info("Database table created/verified")


def load_to_database(records, batch_size=1000):
    """Load physician records into the database"""
    logger.info("Connecting to database...")
    
    conn = psycopg2.connect(DATABASE_URL)
    
    try:
        # Create table if needed
        create_database_table(conn)
        
        # Prepare upsert statement
        upsert_sql = """
        INSERT INTO physicians (
            npi, name, first_name, last_name, credential, gender,
            specialty, taxonomy_code, address, address_2, city, state, zip, phone,
            enumeration_date, last_update, is_sole_proprietor, updated_at
        ) VALUES (
            %(npi)s, %(name)s, %(first_name)s, %(last_name)s, %(credential)s, %(gender)s,
            %(specialty)s, %(taxonomy_code)s, %(address)s, %(address_2)s, %(city)s, %(state)s, %(zip)s, %(phone)s,
            %(enumeration_date)s, %(last_update)s, %(is_sole_proprietor)s, CURRENT_TIMESTAMP
        )
        ON CONFLICT (npi) DO UPDATE SET
            name = EXCLUDED.name,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            credential = EXCLUDED.credential,
            gender = EXCLUDED.gender,
            specialty = EXCLUDED.specialty,
            taxonomy_code = EXCLUDED.taxonomy_code,
            address = EXCLUDED.address,
            address_2 = EXCLUDED.address_2,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            zip = EXCLUDED.zip,
            phone = EXCLUDED.phone,
            enumeration_date = EXCLUDED.enumeration_date,
            last_update = EXCLUDED.last_update,
            is_sole_proprietor = EXCLUDED.is_sole_proprietor,
            updated_at = CURRENT_TIMESTAMP
        """
        
        batch = []
        total_loaded = 0
        
        with conn.cursor() as cur:
            for record in records:
                # Convert date strings
                for date_field in ['enumeration_date', 'last_update']:
                    if record.get(date_field):
                        try:
                            record[date_field] = datetime.strptime(record[date_field], '%m/%d/%Y').date()
                        except:
                            record[date_field] = None
                    else:
                        record[date_field] = None
                
                batch.append(record)
                
                if len(batch) >= batch_size:
                    execute_batch(cur, upsert_sql, batch)
                    conn.commit()
                    total_loaded += len(batch)
                    logger.info(f"Loaded {total_loaded:,} records...")
                    batch = []
            
            # Load remaining records
            if batch:
                execute_batch(cur, upsert_sql, batch)
                conn.commit()
                total_loaded += len(batch)
        
        logger.info(f"Total records loaded: {total_loaded:,}")
        return total_loaded
        
    finally:
        conn.close()


def get_stats():
    """Get statistics from the database"""
    conn = psycopg2.connect(DATABASE_URL)
    
    try:
        with conn.cursor() as cur:
            stats = {}
            
            # Total count
            cur.execute("SELECT COUNT(*) FROM physicians")
            stats['total'] = cur.fetchone()[0]
            
            # By state (top 10)
            cur.execute("""
                SELECT state, COUNT(*) as cnt 
                FROM physicians 
                WHERE state IS NOT NULL 
                GROUP BY state 
                ORDER BY cnt DESC 
                LIMIT 10
            """)
            stats['by_state'] = cur.fetchall()
            
            # By specialty (top 10)
            cur.execute("""
                SELECT specialty, COUNT(*) as cnt 
                FROM physicians 
                WHERE specialty IS NOT NULL 
                GROUP BY specialty 
                ORDER BY cnt DESC 
                LIMIT 10
            """)
            stats['by_specialty'] = cur.fetchall()
            
            # By credential (top 10)
            cur.execute("""
                SELECT credential, COUNT(*) as cnt 
                FROM physicians 
                WHERE credential IS NOT NULL AND credential != ''
                GROUP BY credential 
                ORDER BY cnt DESC 
                LIMIT 10
            """)
            stats['by_credential'] = cur.fetchall()
            
            return stats
            
    finally:
        conn.close()


def run_etl(download_only=False, skip_download=False, zip_file=None):
    """Run the complete ETL pipeline"""
    logger.info("=" * 60)
    logger.info("Starting NPI Physician ETL")
    logger.info("=" * 60)
    
    start_time = datetime.now()
    
    try:
        # Step 1: Download
        if zip_file:
            filepath = zip_file
        elif skip_download:
            # Find existing file
            data_dir = "./data"
            files = [f for f in os.listdir(data_dir) if f.endswith('.zip')] if os.path.exists(data_dir) else []
            if not files:
                raise ValueError("No ZIP file found and skip_download is True")
            filepath = os.path.join(data_dir, files[0])
        else:
            url, filename = get_latest_nppes_file()
            filepath = download_nppes_file(url, filename)
        
        if download_only:
            logger.info("Download only mode - stopping here")
            return
        
        # Step 2: Parse and Load
        logger.info("Parsing and loading data...")
        records = parse_nppes_csv(filepath)
        total_loaded = load_to_database(records)
        
        # Step 3: Show stats
        logger.info("=" * 60)
        logger.info("ETL Complete! Database Statistics:")
        logger.info("=" * 60)
        
        stats = get_stats()
        
        logger.info(f"Total Physicians: {stats['total']:,}")
        
        logger.info("\nTop 10 States:")
        for state, count in stats['by_state']:
            logger.info(f"  {state}: {count:,}")
        
        logger.info("\nTop 10 Specialties:")
        for specialty, count in stats['by_specialty']:
            logger.info(f"  {specialty[:50]}: {count:,}")
        
        logger.info("\nTop 10 Credentials:")
        for credential, count in stats['by_credential']:
            logger.info(f"  {credential}: {count:,}")
        
        elapsed = datetime.now() - start_time
        logger.info(f"\nTotal time: {elapsed}")
        
    except Exception as e:
        logger.error(f"ETL failed: {e}")
        raise


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='NPI Physician ETL')
    parser.add_argument('--download-only', action='store_true', help='Only download the file')
    parser.add_argument('--skip-download', action='store_true', help='Skip download, use existing file')
    parser.add_argument('--zip-file', type=str, help='Path to existing ZIP file')
    
    args = parser.parse_args()
    
    run_etl(
        download_only=args.download_only,
        skip_download=args.skip_download,
        zip_file=args.zip_file
    )
