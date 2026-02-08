# EverWatt Platform - Architecture Roadmap

## Current Status ✅

We already have a **Modular Monolith** architecture that aligns with best practices:

```
src/
├── modules/
│   ├── battery/       ✅ Fully implemented
│   ├── hvac/          ✅ Placeholder exists
│   └── financials/    ✅ Shared calculations
├── pages/             ✅ Unified UI
├── components/        ✅ Shared UI components
└── core/              ✅ Shared utilities
```

## Recommended Additions 🚀

Based on the Sales Enablement Platform pattern, here's how to expand:

### 1. Training/Compendium Module
**Purpose**: Static educational content + images (like the "Chiller Encyclopedia")

```
src/modules/training/
├── index.ts
├── types.ts
├── content/
│   ├── chillers/
│   │   ├── legacy-water-cooled.ts
│   │   ├── maglev-water-cooled.ts
│   │   └── images/
│   ├── boilers/
│   └── lighting/
├── components/
│   ├── TrainingCard.tsx
│   ├── VSComparison.tsx      // "Legacy 0.8 kW/ton vs MagLev 0.35 kW/ton"
│   └── EquipmentLibrary.tsx
└── pages/
    └── TrainingLibrary.tsx
```

**Features**:
- Equipment identification guides
- Efficiency comparisons (VS cards)
- Technical specifications
- Manufacturer data lookup

### 2. Audit Module
**Purpose**: Capture field data (camera, forms, notes)

```
src/modules/audit/
├── index.ts
├── types.ts
├── components/
│   ├── CameraCapture.tsx
│   ├── EquipmentForm.tsx
│   ├── NotesEditor.tsx
│   └── SitePhotoGallery.tsx
├── hooks/
│   └── useAuditSession.ts    // Manages active audit state
└── pages/
    └── AuditForm.tsx
```

**Features**:
- Photo capture (equipment identification)
- Equipment details form
- Site notes and measurements
- Building profile capture
- **Integration**: Shares data with calculators

### 3. Calculations Module (Expand)
**Purpose**: Unified calculation engine (already started!)

```
src/modules/calcs/
├── battery-calc/      (Move from modules/battery/)
├── hvac-calc/         (Expand modules/hvac/)
│   ├── chiller.ts
│   ├── boiler.ts
│   └── vrf.ts
├── lighting-calc/
│   └── led-retrofit.ts
├── ev-charging-calc/
└── index.ts           // Unified calculator interface
```

**Key Design**:
```typescript
// Unified interface for all calculators
interface Calculator {
  calculate(equipment: Equipment, config: CalcConfig): SavingsResult;
}

// Example: HVAC Calculator embedded in Training page
<TrainingPage 
  equipment={chiller}
  embeddedCalc={<HVACCalculator equipment={chiller} />}
/>
```

### 4. Quote/Project Module
**Purpose**: Generate proposals and manage projects

```
src/modules/quote/
├── index.ts
├── types.ts
├── components/
│   ├── ProjectBuilder.tsx
│   ├── QuoteGenerator.tsx
│   └── PDFExporter.tsx
├── pages/
│   └── ProjectBuilder.tsx
└── utils/
    └── pdf-generator.ts
```

**Features**:
- "Add to Project" button (from any calculator)
- Multi-technology project builder
- PDF quote generation
- Historical project library

## The Perfect Sales Flow ✨

### Scenario: Auditor finds a Legacy Chiller

```
1. IDENTIFY (Audit Module)
   → Auditor snaps photo
   → App identifies: "Water-Cooled Centrifugal Chiller (Legacy)"

2. EDUCATE (Training Module)
   → Shows VS card: "Legacy 0.8 kW/ton vs MagLev 0.35 kW/ton"
   → Embedded on same page: HVAC Calculator component

3. CALCULATE (Calcs Module)
   → Pre-filled: Tonnage, Type (from identification)
   → User enters: Annual Run Hours
   → BOOM: "$42,000/yr savings"

4. QUOTE (Quote Module)
   → Click "Add to Project"
   → Adds to active project
   → Can add Battery + HVAC + Lighting to same project
```

## Implementation Strategy

### Phase 1: Training Module (Week 1-2)
- [ ] Create `src/modules/training/` structure
- [ ] Build TrainingLibrary page
- [ ] Create VS comparison components
- [ ] Add equipment identification content

### Phase 2: Audit Module (Week 2-3)
- [ ] Create `src/modules/audit/` structure
- [ ] Implement camera capture
- [ ] Build equipment form
- [ ] Create audit session state management

### Phase 3: Calculator Integration (Week 3-4)
- [ ] Reorganize calcs into `modules/calcs/`
- [ ] Build embeddable calculator components
- [ ] Add "Calculate Savings" buttons to Training pages
- [ ] Connect Audit → Calculator data flow

### Phase 4: Quote Module (Week 4-5)
- [ ] Create `src/modules/quote/` structure
- [ ] Build project builder UI
- [ ] Implement "Add to Project" functionality
- [ ] PDF generation

### Phase 5: Unified Navigation (Week 5)
- [ ] Update sidebar to show all modules
- [ ] Implement seamless navigation
- [ ] Add project context (active audit/project)

## Key Technical Decisions

### ✅ Keep React + Vite (Not Next.js)
**Why**: 
- You're already set up and productive
- Vite is faster for development
- Modular structure works perfectly with React
- No need for SSR (this is a business tool, not a public website)

### ✅ Shared State Management
**Consider adding**: Zustand or React Context for:
- Active audit session
- Active project
- Building profile data
- User preferences

### ✅ Data Persistence
**Options**:
- LocalStorage for offline mode
- API integration for cloud sync
- IndexedDB for large datasets

## Benefits of This Architecture

1. **No Context Switching**: Everything in one app
2. **Shared Data**: Calculators read from same audit session
3. **Modular but Unified**: Each module is self-contained but shares context
4. **Extensible**: Easy to add new calculators or training content
5. **Offline Capable**: Can cache entire app for field use

## Example: Seamless Integration

```tsx
// Training Page with Embedded Calculator
function ChillerTrainingPage() {
  const { identifiedEquipment } = useAuditSession();
  const { activeProject } = useProject();
  
  return (
    <div>
      <TrainingContent equipment={identifiedEquipment} />
      
      {/* VS Comparison */}
      <VSComparison 
        legacy={{ efficiency: 0.8 }}
        modern={{ efficiency: 0.35 }}
      />
      
      {/* Embedded Calculator */}
      <HVACCalculator 
        equipment={identifiedEquipment}
        onCalculate={(savings) => {
          // Results appear inline
        }}
        onAddToProject={() => {
          activeProject.add(identifiedEquipment, savings);
        }}
      />
    </div>
  );
}
```

This is the "Excel tabs" metaphor - different modules, same file, seamless data flow.

