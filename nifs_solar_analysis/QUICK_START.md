# Quick Start Guide

## Installation (5 minutes)

1. **Navigate to the project directory:**
```bash
cd nifs_solar_analysis
```

2. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

3. **Verify template path:**
   - Open `app.py` in a text editor
   - Find the line: `TEMPLATE_PATH = os.getenv(...)`
   - Update the path to point to your template file:
     ```
     C:\Users\nikjo\OneDrive\Desktop\EverWatt_Engine\REPORT_APP\SOLAR\016647 - NIFS Analysis Template.xlsx
     ```

## Running the Application

### Windows:
Double-click `run_app.bat` or run:
```bash
streamlit run app.py
```

### Mac/Linux:
```bash
chmod +x run_app.sh
./run_app.sh
```

Or directly:
```bash
streamlit run app.py
```

The app will open in your browser at `http://localhost:8501`

## First Project Walkthrough

### Step 1: Project Initialization
1. Enter a project name (e.g., "Smith Manufacturing - Solar Project")
2. Enter total estimated savings (e.g., 48,088 kWh)
3. Click "Next: Meter Analysis →"

### Step 2: Meter Analysis
1. Click "➕ Add New Meter"
2. Enter Service Account ID (SAID)
3. Check "Has Solar on this meter?" if applicable
4. If solar:
   - Enter allocated savings (e.g., 22,115 kWh)
   - Upload PG&E Usage Report (PDF or CSV)
   - OR manually enter 12 months of usage data
5. Click "Add Meter"
6. Repeat for all meters
7. Click "Next: Review & Export →"

### Step 3: Review & Export
1. Review the summary metrics
2. Check the charts and detailed breakdown
3. Click "Generate Excel Report"
4. Click "📥 Download Excel File"
5. The file is ready for submission!

## Testing the Calculation Engine

Run the test suite to verify everything works:
```bash
python test_calculations.py
```

## Inspecting the Template

If you need to adjust cell references in the Excel generator:
```bash
python inspect_template.py "path\to\template.xlsx"
```

This will show you the template structure and help identify correct cell references.

## Troubleshooting

### "Template not found" error
- Verify the template path in `app.py`
- Ensure the file exists at that location
- Use forward slashes or double backslashes in Windows paths

### PDF extraction fails
- Try converting the PDF to CSV first
- Use manual data entry as a fallback
- For Phase 3, ensure OpenAI API key is set in `.env`

### Import errors
- Make sure you're in the `nifs_solar_analysis` directory
- Verify all packages are installed: `pip install -r requirements.txt`

## Next Steps

- **Phase 1 Complete**: You can now use the app with manual data entry
- **Phase 2**: Fine-tune Excel cell references based on your template
- **Phase 3**: Add OpenAI API key for automatic PDF parsing

## Getting Help

1. Check the `README.md` for detailed documentation
2. Run `python inspect_template.py` to understand template structure
3. Review `test_calculations.py` for calculation examples

