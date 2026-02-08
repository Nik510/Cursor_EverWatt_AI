# NIFS Solar Analysis Application

Automated tool for calculating OBF (On-Bill Financing) qualification for solar projects using NIFS (Non-IOU Fuel Source) analysis.

## Overview

This application democratizes the NIFS analysis process by embedding expert logic into code, allowing any employee to generate OBF-compliant loan amount calculations by simply uploading utility data.

## Features

- **3-Step Wizard Interface**: Guided workflow prevents errors
- **AI-Powered Data Extraction**: Automatically extracts usage data from PDF/CSV utility bills
- **Automated Calculations**: Replicates exact NIFS logic from approved spreadsheets
- **Compliant Excel Output**: Generates files using the approved template format
- **Visual Feedback**: Charts and tables show eligible vs. requested savings

## Installation

1. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env and add your API keys (optional for Phase 1-2)
```

3. **Verify template path:**
Update `TEMPLATE_PATH` in `app.py` or set it as an environment variable to point to:
```
016647 - NIFS Analysis Template.xlsx
```

## Usage

### Running the Application

```bash
streamlit run app.py
```

The application will open in your browser at `http://localhost:8501`

### Workflow

#### Step 1: Project Initialization
- Enter project name
- Enter total estimated project savings (kWh)

#### Step 2: Meter Analysis
- Add meters (Service Account IDs)
- Toggle "Has Solar" for each meter
- For solar meters:
  - Enter allocated savings
  - Upload PG&E Usage Report (PDF/CSV) OR manually enter 12 months of usage data
- System automatically calculates eligible savings based on NIFS rules

#### Step 3: Review & Export
- Review project totals and meter-by-meter breakdown
- View charts showing requested vs. eligible savings
- Generate and download the Excel submission file

## NIFS Calculation Logic

The core NIFS rules implemented:

1. **Negative Usage (Net Export)**: If usage ≤ 0, eligible savings = 0
2. **Positive Usage**: Eligible savings = min(monthly_target, actual_usage)
3. **Monthly Distribution**: Annual savings are split evenly across 12 months, then capped

## Project Structure

```
nifs_solar_analysis/
├── app.py                 # Streamlit main application
├── nifs_engine.py         # Core calculation logic
├── excel_generator.py     # Excel template filler
├── ai_extractor.py        # PDF/CSV data extraction
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
└── README.md             # This file
```

## Implementation Phases

### Phase 1: Calculator (Current)
✅ Streamlit interface with manual data entry
✅ Core NIFS calculation engine
✅ Basic Excel generation

### Phase 2: Template Filler (In Progress)
- Full OpenPyXL integration
- Complete template cell mapping
- Multi-meter sheet generation

### Phase 3: AI Integration (Planned)
- OpenAI API integration for PDF parsing
- Azure Document Intelligence support
- Advanced OCR for complex bill formats

## Troubleshooting

### Template Not Found
- Verify the template path in `app.py` or set `TEMPLATE_PATH` environment variable
- Ensure the template file exists at the specified location

### PDF Extraction Fails
- Try converting PDF to CSV first
- Use manual data entry as fallback
- For Phase 3, ensure OpenAI API key is set

### Excel Generation Errors
- Check that template structure matches expected format
- Use `excel_generator.inspect_template()` to view template structure
- Adjust cell references in `excel_generator.py` if needed

## Development

### Testing the Calculation Engine

```python
from nifs_engine import NIFSCalculator

calculator = NIFSCalculator()
usage_data = [
    {'date': '2024-01-26', 'kwh': 3100},
    {'date': '2024-02-26', 'kwh': 2800},
    # ... 12 months
]

result = calculator.calculate_nifs_eligibility(
    meter_id="123456789",
    annual_savings=22115.06,
    usage_data=usage_data
)

print(f"Eligible: {result['total_eligible']} kWh")
```

### Inspecting Template Structure

```python
from excel_generator import NIFSExcelGenerator

generator = NIFSExcelGenerator("path/to/template.xlsx")
info = generator.inspect_template()
print(info)
```

## License

Internal use only - EverWatt Energy

