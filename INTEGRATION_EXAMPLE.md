# Module Integration Example

## How Modules Work Together

This document shows how the modular architecture enables seamless workflows.

## Example: HVAC Audit → Training → Calculation → Quote

### 1. Audit Module Captures Data

```typescript
// src/modules/audit/hooks/useAuditSession.ts
export function useAuditSession() {
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  
  const capturePhoto = async (image: File) => {
    // AI identification (future)
    const identified = await identifyEquipment(image);
    setEquipment(identified);
  };
  
  return { equipment, capturePhoto };
}
```

### 2. Training Module Shows Context

```tsx
// src/pages/TrainingPage.tsx
import { useAuditSession } from '@/modules/audit';
import { VSComparison } from '@/modules/training/components';
import { HVACCalculator } from '@/modules/calcs/hvac-calc';

function ChillerTrainingPage() {
  const { equipment } = useAuditSession(); // Shared state!
  
  if (!equipment) {
    return <EquipmentNotFound />;
  }
  
  return (
    <div>
      {/* Training Content */}
      <TrainingContent equipment={equipment} />
      
      {/* VS Comparison - auto-populated from equipment */}
      <VSComparison
        current={equipment}
        alternatives={findAlternatives(equipment)}
      />
      
      {/* Embedded Calculator - pre-filled with audit data */}
      <HVACCalculator
        equipment={equipment}
        defaultValues={{
          tonnage: equipment.tonnage,      // From audit
          runHours: equipment.avgRunHours, // From audit
          type: equipment.type,            // From audit
        }}
      />
    </div>
  );
}
```

### 3. Calculator Uses Shared Data

```tsx
// src/modules/calcs/hvac-calc/components/HVACCalculator.tsx
import { calculateHVACSavings } from '../logic';
import { useAuditSession } from '@/modules/audit';
import { useProject } from '@/modules/quote';

export function HVACCalculator({ equipment, defaultValues }) {
  const { updateEquipment } = useAuditSession();
  const { addToProject } = useProject();
  
  const [savings, setSavings] = useState(null);
  
  const handleCalculate = (inputs) => {
    // Calculation happens locally (fast!)
    const result = calculateHVACSavings({
      equipment,
      ...inputs,
    });
    setSavings(result);
    
    // Update audit session with calculated data
    updateEquipment({
      ...equipment,
      estimatedSavings: result,
    });
  };
  
  return (
    <div>
      <CalculatorForm 
        defaults={defaultValues}
        onSubmit={handleCalculate}
      />
      
      {savings && (
        <SavingsDisplay savings={savings}>
          <button onClick={() => addToProject(equipment, savings)}>
            Add to Project
          </button>
        </SavingsDisplay>
      )}
    </div>
  );
}
```

### 4. Quote Module Aggregates Everything

```tsx
// src/modules/quote/components/ProjectBuilder.tsx
import { useAuditSession } from '@/modules/audit';
import { useProject } from '@/modules/quote/hooks';

export function ProjectBuilder() {
  const { activeProject } = useProject();
  const { equipment: allEquipment } = useAuditSession();
  
  // Project contains equipment from multiple modules
  const projectItems = activeProject.items; // Battery + HVAC + Lighting
  
  const totalSavings = projectItems.reduce(
    (sum, item) => sum + item.annualSavings,
    0
  );
  
  return (
    <div>
      <ProjectHeader project={activeProject} />
      
      {/* Multi-technology project */}
      <ProjectItems items={projectItems} />
      
      <FinancialSummary
        totalSavings={totalSavings}
        paybackPeriod={calculatePayback(activeProject)}
      />
      
      <button onClick={generatePDF}>Generate Quote PDF</button>
    </div>
  );
}
```

## Shared State Architecture

```typescript
// src/store/auditStore.ts (using Zustand or Context)
import create from 'zustand';

interface AuditStore {
  activeSession: AuditSession | null;
  equipment: Equipment[];
  buildingProfile: BuildingProfile | null;
}

export const useAuditStore = create<AuditStore>((set) => ({
  activeSession: null,
  equipment: [],
  buildingProfile: null,
  
  addEquipment: (equipment) => set((state) => ({
    equipment: [...state.equipment, equipment],
  })),
  
  setBuildingProfile: (profile) => set({ buildingProfile: profile }),
}));
```

## Benefits Illustrated

### Scenario: Multi-Technology Audit

1. **Battery Analysis**: Uses building load profile from audit
   ```tsx
   <BatteryCalculator 
     loadProfile={auditStore.buildingProfile} 
   />
   ```

2. **HVAC Analysis**: Uses equipment list from audit
   ```tsx
   <HVACCalculator 
     equipment={auditStore.equipment.find(e => e.type === 'chiller')}
   />
   ```

3. **Combined Project**: Both technologies in one quote
   ```tsx
   <ProjectBuilder 
     items={[
       ...batteryRecommendations,
       ...hvacRecommendations,
     ]}
   />
   ```

## File Structure After Expansion

```
src/
├── modules/
│   ├── audit/           ✅ NEW: Field data capture
│   ├── training/        ✅ NEW: Educational content
│   ├── calcs/           ✅ EXPAND: Unified calculators
│   │   ├── battery-calc/
│   │   ├── hvac-calc/
│   │   ├── lighting-calc/
│   │   └── ev-calc/
│   ├── quote/           ✅ NEW: Project/quote builder
│   ├── battery/         (Legacy - can migrate to calcs/battery-calc)
│   ├── hvac/            (Legacy - migrate to calcs/hvac-calc)
│   └── financials/      ✅ Shared by all calculators
├── store/               ✅ NEW: Shared state (Zustand/Context)
│   ├── auditStore.ts
│   ├── projectStore.ts
│   └── userStore.ts
└── pages/
    ├── AuditForm.tsx    ✅ NEW
    ├── TrainingLibrary.tsx ✅ NEW
    ├── ProjectBuilder.tsx ✅ NEW
    └── ... (existing pages)
```

This is the **Modular Monolith** in action - separate concerns, unified experience.

