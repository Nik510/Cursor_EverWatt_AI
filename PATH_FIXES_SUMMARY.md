# Path Fixes Summary

## ✅ Completed: Made App Self-Contained

All hardcoded paths to `C:\Users\nikjo\OneDrive\Desktop\EverWatt_Engine` have been updated to use relative paths or environment variables.

## Changes Made

### 1. **Data Files Copied** ✅
- `INTERVAL.csv` → `data/INTERVAL.csv`
- `USAGE.csv` → `data/USAGE.csv`
- `battery-catalog.csv` → `data/battery-catalog.csv` (already existed)
- `battery-catalog.csv` → `public/battery-catalog.csv` (for browser access)

### 2. **Critical Application Files Updated** ✅
- `src/scripts/recommend-battery.ts` - Now uses `data/` folder with relative paths
- `src/pages/BatteryLibrary.tsx` - Now uses `/battery-catalog.csv` from public folder
- `test-excel.ts` - Now uses `data/USAGE.csv` with relative paths

### 3. **Extraction Scripts Updated** ✅
All extraction scripts now use environment variable `TRAINING_DATA_BASE_PATH` with fallback to original location:
- `src/scripts/extract-all-ee-measures-2.ts`
- `src/scripts/extract-pdfs-v2.ts`
- `src/scripts/extract-battery-training-content.ts`
- `src/scripts/extract-hvac-training-content.ts`
- `src/scripts/extract-historical-templates.ts`
- `src/scripts/extract-excel-templates.ts`
- `src/scripts/extract-all-remaining-docx.ts`
- `src/scripts/extract-all-pdfs-comprehensive.ts`
- `src/scripts/import-pdf-training-manuals.ts`
- `src/scripts/import-all-training-data.ts`
- `src/scripts/extract-bulb-types.ts`
- `src/scripts/extract-bulb-images.ts`
- `src/scripts/import-measures-docx.ts`
- `src/scripts/parse-extracted-measures.ts`
- `src/scripts/inventory-training-data.ts`
- `src/scripts/inventory-full-training-data.ts`

### 4. **Python Scripts Updated** ✅
- `scripts/extract_pge_docx_notes.py` - Uses `TRAINING_DATA_BASE_PATH` env var
- `scripts/parse_pge_xlsx.py` - Uses `TRAINING_DATA_BASE_PATH` env var

### 5. **Metadata Files Updated** ✅
- `src/utils/rates/data/pge-tariff-tables.json` - Updated source_root reference

## How It Works Now

### For Application Code (Production):
- Uses relative paths from `process.cwd()` pointing to `data/` folder
- Browser components use `/battery-catalog.csv` from public folder
- No external dependencies on OneDrive folder

### For Extraction Scripts (One-Time Use):
- Can use `TRAINING_DATA_BASE_PATH` environment variable
- Falls back to original hardcoded path if env var not set
- These scripts are for one-time data ingestion only

## Environment Variables

To use a different source location for extraction scripts:
```bash
# Windows PowerShell
$env:TRAINING_DATA_BASE_PATH = "C:\path\to\your\data"
npx tsx src/scripts/extract-pdfs-v2.ts

# Linux/Mac
export TRAINING_DATA_BASE_PATH="/path/to/your/data"
npx tsx src/scripts/extract-pdfs-v2.ts
```

## Status

✅ **App is now self-contained** - All critical files use relative paths
✅ **Extraction scripts are configurable** - Use env vars with sensible fallbacks
✅ **Data files are local** - No external dependencies for running the app

## Notes

- Extraction scripts still reference the original source location as a fallback, but this is intentional since they're one-time data ingestion tools
- The extracted data is already stored in the `data/` folder, so the app doesn't need the original source files
- Browser components that need CSV access should use files from the `public/` folder or be served via API endpoints
