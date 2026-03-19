"""
NPI API ETL - Load Physician Data using NPPES REST API

This is a FASTER alternative that uses the NPPES API instead of downloading
the 8GB file. Good for:
- Initial testing
- Loading specific states/specialties
- Incremental updates

Author: Healthcare News ETL
Date: 2026
"""

import os
import requests
import psycopg2
from psycopg2.extras import execute_batch
from datetime import datetime
import logging
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
DATABASE_URL = os.getenv('DATABASE_URL')
NPPES_API_URL = "https://npiregistry.cms.hhs.gov/api/"

# States to load (all 50 + DC)
ALL_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
    'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
    'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
    'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
    'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

# Top 10 states (for quick testing)
TOP_STATES = ['CA', 'TX', 'NY', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI']


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


def fetch_physicians_from_api(state, taxonomy_description, limit=200, skip=0):
    """Fetch physicians from NPPES API for a specific state and specialty"""
    params = {
        'version': '2.1',
        'enumeration_type': 'NPI-1',  # Individual providers only
        'state': state,
        'taxonomy_description': taxonomy_description,
        'limit': limit,
        'skip': skip,
    }
    
    try:
        response = requests.get(NPPES_API_URL, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        # Check for API errors
        if 'Errors' in data:
            logger.warning(f"API returned errors: {data['Errors']}")
            return [], 0
        
        return data.get('results', []), data.get('result_count', 0)
    except Exception as e:
        logger.error(f"API error for {state}: {e}")
        return [], 0


def transform_api_record(record):
    """Transform API response to database record"""
    basic = record.get('basic', {})
    addresses = record.get('addresses', [])
    taxonomies = record.get('taxonomies', [])
    
    # Get primary practice address (type = 'LOCATION')
    practice_addr = None
    for addr in addresses:
        if addr.get('address_purpose') == 'LOCATION':
            practice_addr = addr
            break
    if not practice_addr and addresses:
        practice_addr = addresses[0]
    
    # Get primary taxonomy
    primary_taxonomy = None
    for tax in taxonomies:
        if tax.get('primary'):
            primary_taxonomy = tax
            break
    if not primary_taxonomy and taxonomies:
        primary_taxonomy = taxonomies[0]
    
    # Clean phone number
    phone = practice_addr.get('telephone_number', '') if practice_addr else ''
    if phone:
        digits = ''.join(c for c in phone if c.isdigit())
        if len(digits) == 10:
            phone = f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    
    # Build name
    first_name = (basic.get('first_name') or '').strip().title()
    last_name = (basic.get('last_name') or '').strip().title()
    name = f"{first_name} {last_name}".strip()
    
    return {
        'npi': record.get('number', ''),
        'name': name,
        'first_name': first_name,
        'last_name': last_name,
        'credential': (basic.get('credential') or '').strip().upper()[:50],
        'gender': (basic.get('gender') or '').strip().upper()[:1],
        'specialty': (primary_taxonomy.get('desc') or '')[:200] if primary_taxonomy else None,
        'taxonomy_code': (primary_taxonomy.get('code') or '')[:20] if primary_taxonomy else None,
        'address': (practice_addr.get('address_1') or '')[:200] if practice_addr else None,
        'address_2': (practice_addr.get('address_2') or '')[:200] if practice_addr else None,
        'city': (practice_addr.get('city') or '').title()[:100] if practice_addr else None,
        'state': (practice_addr.get('state') or '').upper()[:2] if practice_addr else None,
        'zip': (practice_addr.get('postal_code') or '')[:10] if practice_addr else None,
        'phone': phone[:20] if phone else None,
        'enumeration_date': parse_date(basic.get('enumeration_date')),
        'last_update': parse_date(basic.get('last_updated')),
        'is_sole_proprietor': basic.get('sole_proprietor') == 'YES',
    }


def parse_date(date_str):
    """Parse date string to date object"""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except:
        return None


def load_to_database(records, conn):
    """Load records into database"""
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
    
    with conn.cursor() as cur:
        execute_batch(cur, upsert_sql, records)
    conn.commit()


# Common physician specialties to search
PHYSICIAN_SPECIALTIES = [
    'Family Medicine',
    'Internal Medicine',
    'Pediatrics',
    'Obstetrics & Gynecology',
    'Psychiatry',
    'Surgery',
    'Emergency Medicine',
    'Anesthesiology',
    'Radiology',
    'Cardiology',
    'Dermatology',
    'Neurology',
    'Orthopedic',
    'Ophthalmology',
    'Oncology',
    'Gastroenterology',
    'Pulmonology',
    'Nephrology',
    'Endocrinology',
    'Rheumatology',
    'Urology',
    'Otolaryngology',
    'Pathology',
    'Physical Medicine',
    'Allergy',
    'Infectious Disease',
    'Nurse Practitioner',
    'Physician Assistant',
]


def load_state(state, conn, max_records=None):
    """Load all physicians for a specific state"""
    logger.info(f"Loading physicians from {state}...")
    
    total_loaded = 0
    
    for specialty in PHYSICIAN_SPECIALTIES:
        if max_records and total_loaded >= max_records:
            break
            
        skip = 0
        limit = 200  # API max is 200
        specialty_count = 0
        
        while True:
            records, result_count = fetch_physicians_from_api(state, specialty, limit=limit, skip=skip)
            
            if not records:
                break
            
            # Transform records
            transformed = [transform_api_record(r) for r in records]
            
            # Filter out records without NPI
            transformed = [r for r in transformed if r['npi']]
            
            # Load to database
            if transformed:
                load_to_database(transformed, conn)
                total_loaded += len(transformed)
                specialty_count += len(transformed)
            
            # Check if we've loaded all records for this specialty
            skip += limit
            if skip >= result_count:
                break
            
            # Check max records limit
            if max_records and total_loaded >= max_records:
                break
            
            # Rate limiting - be nice to the API
            time.sleep(0.3)
        
        if specialty_count > 0:
            logger.info(f"  {state} - {specialty}: {specialty_count} records")
    
    logger.info(f"  {state}: Complete - {total_loaded} total records")
    return total_loaded


def get_stats(conn):
    """Get database statistics"""
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM physicians")
        total = cur.fetchone()[0]
        
        cur.execute("""
            SELECT state, COUNT(*) as cnt 
            FROM physicians 
            WHERE state IS NOT NULL 
            GROUP BY state 
            ORDER BY cnt DESC 
            LIMIT 10
        """)
        by_state = cur.fetchall()
        
        cur.execute("""
            SELECT specialty, COUNT(*) as cnt 
            FROM physicians 
            WHERE specialty IS NOT NULL 
            GROUP BY specialty 
            ORDER BY cnt DESC 
            LIMIT 10
        """)
        by_specialty = cur.fetchall()
    
    return {
        'total': total,
        'by_state': by_state,
        'by_specialty': by_specialty
    }


def run_etl(states=None, max_per_state=None):
    """Run the ETL for specified states"""
    if states is None:
        states = TOP_STATES  # Default to top 10 states
    
    logger.info("=" * 60)
    logger.info("Starting NPI API ETL")
    logger.info(f"States to load: {states}")
    logger.info("=" * 60)
    
    start_time = datetime.now()
    
    conn = psycopg2.connect(DATABASE_URL)
    
    try:
        # Create table
        create_database_table(conn)
        
        # Load each state
        grand_total = 0
        for state in states:
            count = load_state(state, conn, max_records=max_per_state)
            grand_total += count
        
        # Show stats
        logger.info("=" * 60)
        logger.info("ETL Complete!")
        logger.info("=" * 60)
        
        stats = get_stats(conn)
        
        logger.info(f"\nTotal Physicians in Database: {stats['total']:,}")
        
        logger.info("\nTop 10 States:")
        for state, count in stats['by_state']:
            logger.info(f"  {state}: {count:,}")
        
        logger.info("\nTop 10 Specialties:")
        for specialty, count in stats['by_specialty']:
            logger.info(f"  {specialty[:50]}: {count:,}")
        
        elapsed = datetime.now() - start_time
        logger.info(f"\nTotal time: {elapsed}")
        logger.info(f"Records loaded this run: {grand_total:,}")
        
    finally:
        conn.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='NPI API ETL')
    parser.add_argument('--states', nargs='+', help='States to load (e.g., CA TX NY)')
    parser.add_argument('--all-states', action='store_true', help='Load all 50 states')
    parser.add_argument('--top-states', action='store_true', help='Load top 10 states (default)')
    parser.add_argument('--max-per-state', type=int, help='Max records per state (for testing)')
    
    args = parser.parse_args()
    
    if args.all_states:
        states = ALL_STATES
    elif args.states:
        states = [s.upper() for s in args.states]
    else:
        states = TOP_STATES
    
    run_etl(states=states, max_per_state=args.max_per_state)
