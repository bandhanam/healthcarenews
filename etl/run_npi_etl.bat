@echo off
cd /d C:\Users\meenketan.rathore\Documents\GitHub\healthcarenews\etl
python npi_full_etl.py >> etl_log.txt 2>&1
