"""Check database statistics"""
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

print('=' * 60)
print('  PHYSICIAN NPI DATABASE - STATS')
print('=' * 60)

cur.execute('SELECT COUNT(*) FROM physicians')
total = cur.fetchone()[0]
print(f'\n  TOTAL RECORDS: {total:,}')

cur.execute('SELECT state, COUNT(*) FROM physicians WHERE state IS NOT NULL GROUP BY state ORDER BY COUNT(*) DESC')
print('\n  BY STATE:')
for state, count in cur.fetchall():
    print(f'    {state}: {count:,}')

cur.execute('SELECT specialty, COUNT(*) FROM physicians WHERE specialty IS NOT NULL GROUP BY specialty ORDER BY COUNT(*) DESC LIMIT 15')
print('\n  TOP 15 SPECIALTIES:')
for specialty, count in cur.fetchall():
    print(f'    {specialty[:45]}: {count:,}')

cur.execute("SELECT credential, COUNT(*) FROM physicians WHERE credential IS NOT NULL AND credential != '' GROUP BY credential ORDER BY COUNT(*) DESC LIMIT 10")
print('\n  TOP CREDENTIALS:')
for cred, count in cur.fetchall():
    print(f'    {cred}: {count:,}')

print('\n' + '=' * 60)
conn.close()
