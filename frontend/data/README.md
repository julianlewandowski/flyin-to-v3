# Airport Data

This directory contains the airport CSV file from Kaggle.

## Setup Instructions

1. **Download the airports CSV from Kaggle:**
   - Visit: https://www.kaggle.com/datasets/thoudamyoihenba/airports
   - Download the CSV file (usually named `airports.csv` or similar)

2. **Place the CSV file here:**
   - Save it as `airports.csv` in this directory (`frontend/data/airports.csv`)

3. **Run the conversion script:**
   ```bash
   npm run convert-airports
   ```

   This will:
   - Read the CSV file
   - Extract all airports with IATA codes (commercial airports)
   - Remove duplicates
   - Generate `frontend/lib/airports.ts` with all airports

4. **The generated file will be used automatically** by the airport search functionality.

## Notes

- Only airports with valid IATA codes are included (filters out `\N` and empty values)
- Duplicate IATA codes are removed (keeps first occurrence)
- The script handles CSV parsing with quoted fields that may contain commas
- The generated TypeScript file maintains the same interface and search functions



