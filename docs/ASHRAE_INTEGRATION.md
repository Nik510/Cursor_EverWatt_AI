# ASHRAE Guidelines Integration

## ✅ Successfully Extracted and Integrated

The ASHRAE Knowledge Architecture compendium has been extracted and integrated into the EverWatt Engine.

## 📄 Document Details

- **Title**: The ASHRAE Knowledge Architecture: A Compendium for Artificial Intelligence Model Training
- **Source**: `C:\Users\nikjo\OneDrive\Desktop\EverWatt_Engine\ASHRAE_GUIDELINES\`
- **Extracted**: 42,271 characters
- **Sections**: 59 structured sections
- **Categories**: 31 HVAC/energy efficiency categories
- **Keywords**: 25 technical keywords

## 📁 Storage Location

- **Extracted JSON**: `data/extracted-ashrae-guidelines/ashrae-knowledge-architecture.json`
- **Full Text**: `data/extracted-ashrae-guidelines/ashrae-full-text.txt`
- **Summary**: `data/extracted-ashrae-guidelines/summary.txt`
- **Public Access**: `public/data/ashrae-knowledge-architecture.json`
- **Integrated**: Added to `structured-training-content.json` as category "hvac"

## 🔍 Content Overview

The ASHRAE document covers:

1. **Institutional Framework of ASHRAE**
   - Origins and historical consolidation
   - Governance and committee structure
   - Consensus process and standards development
   - Ethical mandates and AI policy

2. **Technical Repository: ASHRAE Handbooks**
   - Fundamentals: Physics of the built environment
   - HVAC Systems and Equipment
   - HVAC Applications: System integration
   - Refrigeration: Thermodynamics in practice

3. **Regulatory Standards for Energy Performance**
   - Standard 90.1: The global energy benchmark
   - Standard 100: Retrofitting existing stock
   - Standard 189.1: The green building code

4. **Standards for Indoor Environmental Quality (IEQ)**
   - Standard 62.1: Ventilation logic
   - Standard 55: Thermal comfort modeling
   - Standard 180: Maintenance and performance preservation

5. **Commercial Building Energy Audits: Standard 211**
   - Level 1: Investigation and benchmarking
   - Level 2: Survey and analytic rigor
   - Level 3: Investment grade analysis and risk assessment
   - Normative reporting and data standardization

6. **Advanced Design and Digital Interoperability**
   - Advanced Energy Design Guides (AEDGs)
   - BuildingSync and the digital audit
   - Building EQ: Operational rating

7. **Synthesis: Training the AI Model**
   - Framework for AI model training
   - Key ASHRAE standards and their role

## 🔑 Key Topics Covered

- **HVAC Systems**: Chillers, heat pumps, VRF, boilers, steam systems
- **Energy Efficiency**: Standards 90.1, 100, 189.1
- **Indoor Air Quality**: Standards 62.1, 55, ventilation requirements
- **Energy Audits**: Standard 211, Level 1/2/3 audits, risk assessment
- **Building Performance**: Thermal comfort, psychrometrics, load calculations
- **Digital Integration**: BuildingSync, BEDES, data standardization
- **Standards Compliance**: Prescriptive, performance-based, and rating methods

## 🔍 How to Access

### Via Data Service
```typescript
import * as dataService from '../services/data-service';

// Search for ASHRAE content
const results = await dataService.searchData('ASHRAE Standard 90.1');

// Get by category
const hvacContent = await dataService.getTrainingContentByCategory('hvac');
```

### Via React Hooks
```tsx
import { useSearch, useTrainingContentByCategory } from '../hooks/useDataService';

// Search
const { results } = useSearch('thermal comfort PMV');

// Get HVAC category
const { content } = useTrainingContentByCategory('hvac');
```

### Via API
```bash
# Search
GET /api/data/search?q=ASHRAE+Standard+211&categories=hvac

# Get by category
GET /api/data/training/category/hvac
```

## 📊 Integration Status

✅ **Extracted** - Full text and structure extracted  
✅ **Structured** - 59 sections organized by heading and level  
✅ **Categorized** - Tagged as "hvac" category  
✅ **Indexed** - Available in search index  
✅ **Accessible** - Available via data service, hooks, and API  

## 🎯 Use Cases

This ASHRAE content is now available for:

1. **HVAC System Design** - Reference ASHRAE standards and handbooks
2. **Energy Auditing** - Access Standard 211 audit procedures
3. **Compliance Checking** - Verify against ASHRAE 90.1, 62.1, 55
4. **Load Calculations** - Reference psychrometric and thermodynamic data
5. **Thermal Comfort** - Access PMV/PPD models and adaptive comfort
6. **Building Performance** - Reference energy efficiency standards

## 📝 Notes

- Content is searchable across all training data
- Integrated with existing HVAC training content
- Can be cross-referenced with energy efficiency measures
- Available for AI model training and reference

---

*Integrated: December 13, 2025*
