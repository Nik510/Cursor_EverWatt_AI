# EverWatt Platform - Integration Plan

## Current State Analysis

### ✅ What You Have:

1. **Main EverWatt Engine** (`C:\everwatt-engine`)
   - ✅ Battery calculator (fully working)
   - ✅ Modular architecture (battery, hvac, financials)
   - ✅ API server with file upload
   - ✅ UI framework (React + Vite + Tailwind)
   - ✅ Pages: Dashboard, Battery Library, Rate Library, New Analysis

2. **Training App** (`EVERWATT AI\TRAINING APP\AI STUDIO\everwatt-hvac-training-module`)
   - ✅ Complete React app with Gemini AI integration
   - ✅ Training content generation
   - ✅ Equipment visualization (AI-generated images)
   - ✅ Vertical market analysis (Hospitals, Office, Manufacturing)
   - ✅ Knowledge base with master measures list
   - ✅ Audit tool components

3. **Training Data** (`EVERWATT AI\TRAINING DATA`)
   - ✅ Battery training manuals (PDFs)
   - ✅ HVAC optimization manuals
   - ✅ Lighting modeling
   - ✅ EV charging guides
   - ✅ Multi-measure stacking
   - ✅ AI prompting frameworks

4. **HVAC Audit** (`EVERWATT AI\HVAC AUDIT`)
   - ⚠️ Word document checklist only
   - ❌ No code yet - needs to be built

---

## Integration Strategy

### Phase 1: Merge Training App into Main Engine (Week 1)

**Goal**: Integrate the existing AI-powered training module into the unified app.

#### Steps:

1. **Copy Training Components**
   ```bash
   # Copy components from training app
   src/modules/training/
   ├── components/
   │   ├── KnowledgeBase.tsx
   │   ├── TrainingView.tsx
   │   ├── VerticalSearch.tsx
   │   ├── ManualView.tsx
   │   └── AuditTool.tsx (from training app)
   ├── services/
   │   └── geminiService.ts
   ├── data/
   │   └── masterMeasuresList.ts
   └── types.ts
   ```

2. **Install Dependencies**
   ```bash
   npm install @google/genai react-markdown remark-gfm lucide-react
   ```

3. **Update Sidebar Navigation**
   - Add "Training Library" to navigation
   - Add "AI Advisor" (from training app)

4. **Create Training Pages**
   - `src/pages/TrainingLibrary.tsx` - Main training hub
   - `src/pages/TechnologyExplorer.tsx` - Equipment knowledge base
   - `src/pages/AIAdvisor.tsx` - AI chat interface

5. **Environment Setup**
   ```env
   # .env
   VITE_GEMINI_API_KEY=your_key_here
   ```

---

### Phase 2: Build HVAC Audit Module (Week 2)

**Goal**: Create the HVAC audit form based on the checklist document.

#### Steps:

1. **Create Audit Module Structure**
   ```
   src/modules/audit/
   ├── components/
   │   ├── CameraCapture.tsx
   │   ├── EquipmentForm.tsx
   │   ├── ChecklistForm.tsx
   │   ├── SiteNotes.tsx
   │   └── PhotoGallery.tsx
   ├── types.ts
   ├── hooks/
   │   └── useAuditSession.ts
   └── utils/
       └── equipmentIdentification.ts
   ```

2. **Read Checklist Document**
   - Parse the Word document checklist
   - Convert to structured TypeScript types
   - Create form components for each section

3. **Build Audit Pages**
   - `src/pages/AuditForm.tsx` - Main audit interface
   - Equipment identification flow
   - Photo capture and tagging
   - Notes and measurements

4. **State Management**
   - Create Zustand store for audit session
   - Persist to localStorage for offline capability
   - Share with calculators

---

### Phase 3: Integrate Training Data (Week 2-3)

**Goal**: Import all training manuals as structured knowledge base.

#### Steps:

1. **Create Data Import Scripts**
   ```
   src/scripts/
   ├── import-training-data.ts
   ├── parse-hvac-manuals.ts
   └── parse-battery-manuals.ts
   ```

2. **Structure Training Data**
   ```
   src/data/training/
   ├── battery/
   │   ├── modeling-sizing.ts
   │   ├── technical-constraints.ts
   │   └── financial-modeling.ts
   ├── hvac/
   │   ├── optimization.ts
   │   └── savings-methodology.ts
   ├── lighting/
   ├── ev-charging/
   └── multi-measure/
   ```

3. **Create Training Data API**
   - Endpoint: `GET /api/training/:category/:topic`
   - Search: `GET /api/training/search?q=...`
   - Used by AI advisor for context

---

### Phase 4: Calculator Integration (Week 3)

**Goal**: Connect audit → training → calculator flow.

#### Steps:

1. **Embed Calculators in Training Pages**
   ```tsx
   // Example: Training page shows equipment, with embedded calculator
   <TrainingEquipmentCard equipment={chiller}>
     <HVACCalculator 
       equipment={chiller}
       defaultValues={auditStore.getEquipmentData(chiller)}
     />
   </TrainingEquipmentCard>
   ```

2. **Build HVAC Calculator Module**
   ```
   src/modules/calcs/hvac-calc/
   ├── chiller.ts
   ├── boiler.ts
   ├── vrf.ts
   ├── components/
   │   └── HVACCalculator.tsx
   └── logic/
       └── savings.ts
   ```

3. **Shared Data Flow**
   ```
   Audit Module → Equipment Data
        ↓
   Training Module → Educational Context
        ↓
   Calculator Module → Savings Calculation
        ↓
   Quote Module → Add to Project
   ```

---

### Phase 5: Quote/Project Module (Week 4)

**Goal**: Build project builder and PDF generation.

#### Steps:

1. **Project Builder**
   - `src/modules/quote/components/ProjectBuilder.tsx`
   - Multi-technology aggregation
   - Financial summary
   - Timeline/implementation plan

2. **PDF Generation**
   - Install `@react-pdf/renderer` or `jsPDF`
   - Generate professional quotes
   - Include calculations and assumptions

3. **Historical Projects**
   - Connect to existing template
   - Import/export functionality

---

## File Structure After Integration

```
everwatt-engine/
├── src/
│   ├── modules/
│   │   ├── audit/              ✅ NEW: Field data capture
│   │   ├── training/           ✅ NEW: AI-powered training (from AI STUDIO)
│   │   ├── calcs/              ✅ EXPAND: Unified calculators
│   │   │   ├── battery-calc/   (from modules/battery)
│   │   │   ├── hvac-calc/      ✅ NEW: HVAC calculations
│   │   │   ├── lighting-calc/  ✅ NEW: Lighting calculations
│   │   │   └── ev-calc/        ✅ NEW: EV charging calculations
│   │   ├── quote/              ✅ NEW: Project builder
│   │   ├── battery/            (legacy, migrate to calcs/battery-calc)
│   │   ├── hvac/               (legacy, migrate to calcs/hvac-calc)
│   │   └── financials/         ✅ Shared by all calculators
│   ├── data/
│   │   └── training/           ✅ NEW: Structured training data
│   ├── services/
│   │   ├── geminiService.ts    ✅ From training app
│   │   └── pdfService.ts       ✅ NEW: PDF generation
│   ├── store/
│   │   ├── auditStore.ts       ✅ NEW: Audit session state
│   │   ├── projectStore.ts     ✅ NEW: Active project state
│   │   └── trainingStore.ts    ✅ NEW: Training preferences
│   ├── pages/
│   │   ├── Dashboard.tsx       ✅ Existing
│   │   ├── TrainingLibrary.tsx ✅ NEW
│   │   ├── TechnologyExplorer.tsx ✅ NEW
│   │   ├── AIAdvisor.tsx       ✅ NEW
│   │   ├── AuditForm.tsx       ✅ NEW
│   │   ├── ProjectBuilder.tsx  ✅ NEW
│   │   └── ... (existing pages)
│   └── components/
│       ├── Sidebar.tsx         ✅ Update navigation
│       └── ... (existing + new)
├── TRAINING_DATA/              ✅ Copy from EVERWATT AI
│   ├── BATTERY_TRAINING_DATA/
│   ├── HVAC_TRAINING_DATA/
│   └── ...
└── package.json                ✅ Update dependencies
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@google/genai": "^1.30.0",      // Gemini AI
    "react-markdown": "^10.1.0",      // Training content
    "remark-gfm": "^4.0.1",           // GitHub-flavored markdown
    "lucide-react": "^0.555.0",       // Icons (if not already)
    "zustand": "^4.5.0",              // State management
    "@react-pdf/renderer": "^3.0.0",  // PDF generation
    "react-webcam": "^7.2.0"          // Camera capture
  }
}
```

---

## Migration Checklist

### Training App Integration:
- [ ] Copy components from `everwatt-hvac-training-module`
- [ ] Install Gemini AI dependencies
- [ ] Set up environment variables
- [ ] Create training pages in main app
- [ ] Test AI functionality
- [ ] Integrate with sidebar navigation

### HVAC Audit:
- [ ] Read and parse checklist document
- [ ] Create TypeScript types
- [ ] Build form components
- [ ] Add camera capture
- [ ] Implement state management
- [ ] Create audit pages

### Training Data:
- [ ] Copy training data folder to project
- [ ] Create import scripts
- [ ] Structure data as TypeScript modules
- [ ] Build search API endpoints
- [ ] Integrate with AI advisor

### Calculator Integration:
- [ ] Build HVAC calculator logic
- [ ] Create embeddable calculator components
- [ ] Connect audit → calculator data flow
- [ ] Test savings calculations
- [ ] Add to training pages

### Project Builder:
- [ ] Create project builder UI
- [ ] Multi-technology aggregation
- [ ] PDF generation
- [ ] Historical project import/export

---

## Quick Start Integration

### Step 1: Copy Training App (15 min)
```bash
# Copy key files
cp -r "C:\Users\nikjo\OneDrive\Desktop\EverWatt_Engine\EVERWATT AI\TRAINING APP\AI STUDIO\everwatt-hvac-training-module\components" src/modules/training/
cp -r "C:\Users\nikjo\OneDrive\Desktop\EverWatt_Engine\EVERWATT AI\TRAINING APP\AI STUDIO\everwatt-hvac-training-module\services" src/modules/training/
```

### Step 2: Install Dependencies (5 min)
```bash
npm install @google/genai react-markdown remark-gfm
```

### Step 3: Create Training Page (30 min)
- Create `src/pages/TrainingLibrary.tsx`
- Import components from training module
- Add to App.tsx routing
- Update Sidebar

### Step 4: Set Environment Variable
```env
# .env
VITE_GEMINI_API_KEY=your_api_key
```

---

## Next Steps

**I recommend starting with Phase 1** - integrating the existing training app first since it's already built and working. Then we can build the HVAC audit module and connect everything together.

Would you like me to:
1. Start integrating the training app into the main engine?
2. Build the HVAC audit module first?
3. Create the data import scripts for training manuals?

Let me know which phase you want to tackle first!

