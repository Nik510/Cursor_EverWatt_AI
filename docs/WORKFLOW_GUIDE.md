# EverWatt Engine - Workflow Guide

## Complete User Workflow

This guide walks through the complete workflow from audit to report generation.

## 1. Audit & Assessment

### Starting a New Audit

1. Navigate to **Audit & Assessment** module from the Module Hub
2. Click **"New Audit"** button
3. Complete the multi-step form:

#### Step 1: Building Information
- **Building Name** (required): Name of the facility
- **Address** (required): Full address
- **Square Footage** (required): Total square footage
- **Building Type**: Office, Retail, Warehouse, etc.
- **Year Built**: Optional
- **Operating Hours**: Hours per week the building operates

#### Step 2: HVAC Systems
- Click **"+ Add System"** for each HVAC system
- Select system type: Chiller, Boiler, or VRF
- Enter:
  - Manufacturer and Model
  - Capacity (tons for chiller/VRF, MBH for boiler)
  - Efficiency ratings
  - Year installed
  - Location
  - Notes

#### Step 3: Lighting Systems
- Click **"+ Add System"** for each lighting system
- Enter:
  - Fixture type and bulb type
  - Number of fixtures
  - Wattage per fixture
  - Controls type (if any)
  - Location
  - Notes

#### Step 4: Summary
- Review all entered data
- Click **"Save Audit"** to persist to backend
- Click **"Send to Calculator"** to use this data in calculations

## 2. Energy Solutions Calculator

### HVAC Calculator

1. Navigate to **Energy Solutions Calculator** → **HVAC Optimization**
2. Click on system type (Chiller, Boiler, or VRF)
3. Click **"Add System"** - defaults are pre-filled
4. Adjust values as needed:
   - Current and proposed efficiency
   - Capacity
   - Operating hours
   - Energy costs
5. Add multiple systems as needed
6. Click **"Calculate Total Savings"**
7. Review results:
   - Annual savings
   - Project cost
   - Payback period
   - NPV (10 years)
   - CO₂ reduction
   - 10-year savings projection chart

### Lighting Calculator

1. Navigate to **Energy Solutions Calculator** → **Lighting Retrofit**
2. Select **LED Retrofit** or **Networked Controls**
3. Click **"Add System"**
4. Adjust:
   - Current and proposed wattage
   - Fixture count
   - Operating hours
   - Energy costs
   - Controls savings % (for controls)
5. Add multiple systems
6. Click **"Calculate Total Savings"**
7. Review results with charts

### Battery Calculator

1. Navigate to **Energy Solutions Calculator** → **Battery Storage**
2. Upload **Interval Data** (15-minute intervals) - CSV or Excel
3. Upload **Monthly Bills** - CSV or Excel
4. Click **"Run Analysis"**
5. Review battery recommendations sorted by best ROI

## 3. Report Generation

1. Navigate to **Report Generator** module
2. Select report type:
   - **Energy Model**: Comprehensive building energy model
   - **Regression Analysis**: Statistical analysis of consumption
   - **Savings Calculation**: Detailed financial analysis
   - **Proposal**: Professional proposal document

3. Configure report:
   - Edit report title
   - Toggle options:
     - Include Charts & Graphs
     - Include Financial Analysis
     - Include Recommendations
   - Select format: **PDF** or **Excel**

4. Review available data indicators
5. Click **"Generate Report"**
6. File downloads automatically

## 4. Live Monitoring (Coming Soon)

The monitoring dashboard will allow real-time tracking of:
- Current demand (kW)
- Today's energy consumption
- Peak demand and reduction
- Monthly costs
- System status (HVAC, Battery, Lighting)
- Demand profile charts
- Energy breakdown charts

## Data Flow

```
Audit Data → Calculator → Results → Report Generator → PDF/Excel
     ↓           ↓           ↓              ↓
  Backend    Backend    Backend        Download
 Storage    Storage    Storage
```

## Tips & Best Practices

### Audit Phase
- Take photos of equipment for reference
- Note model numbers and nameplate data
- Record operating schedules accurately
- Include all major systems

### Calculation Phase
- Use realistic efficiency values from manufacturer specs
- Verify energy costs with utility bills
- Consider degradation over time
- Compare multiple scenarios

### Report Generation
- Ensure all data is saved before generating
- Select appropriate report type for audience
- Include charts for visual impact
- Review financials for accuracy

## Validation

The system includes automatic validation:
- Building data: Required fields, reasonable ranges
- HVAC systems: Efficiency ranges, capacity limits
- Lighting systems: Wattage limits, fixture counts
- Error messages display in red with specific guidance

## Saving & Persistence

- **Audits**: Saved to backend automatically, can be loaded later
- **Calculations**: Saved to backend and session storage
- **Reports**: Generated on-demand from current data
- All data persists across sessions

## Integration Points

- Audit data flows to calculators automatically
- Calculator results are available for reports
- Monitoring (future) will connect to all modules
- All modules share common data layer

