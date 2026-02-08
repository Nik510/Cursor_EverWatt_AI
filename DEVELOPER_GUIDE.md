# EverWatt.AI Developer Guide

## Quick Start

1. **Read the Core Vision**: Start with [EVERWATT_AI_CORE_VISION.md](./EVERWATT_AI_CORE_VISION.md)
2. **Check Alignment**: Use `src/core/vision.ts` for programmatic alignment checks
3. **Follow Principles**: See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines

## Core Vision Reference

The core vision is available in multiple formats:

- **Human-readable**: `EVERWATT_AI_CORE_VISION.md` - Complete vision document
- **Programmatic**: `src/core/vision.ts` - TypeScript constants and alignment checker
- **Quick Reference**: See below

## The Six Pillars

1. **Deeper Savings**: Continuously tune HVAC, VFDs, and other big loads for maximum efficiency
2. **Vendor-Agnostic**: Integrate with anything (Ignition, Niagara, BACnet, Siemens, Johnson Controls, etc.)
3. **Learn & Improve**: Use telemetry + learning to improve performance over time
4. **Scale Expertise**: Encode expert knowledge into repeatable logic
5. **Provide Proof**: M&V-grade reporting that utilities and CFOs accept
6. **Enable Business Models**: Ongoing performance contracts, monitoring subscriptions, portfolio optimization

## Alignment Check Function

```typescript
import { checkAlignment } from '@core/vision';

const alignment = checkAlignment({
  vendorAgnostic: true,    // Works with any BMS/EMS?
  providesProof: true,     // M&V-grade reporting?
  scalesExpertise: true,   // Encodes expert knowledge?
  avoidsLockIn: true,      // No proprietary dependencies?
  learnsFromData: true     // Uses telemetry data?
});

if (!alignment.aligned) {
  console.error('Feature misaligns with core vision:', alignment.issues);
}
```

## Key Modules & Their Vision Alignment

### Energy Intelligence
- **Purpose**: Analyze building data and provide AI-powered insights
- **Vision Alignment**: Learns from data, provides provable results, vendor-agnostic data ingestion

### Audit & Assessment
- **Purpose**: Capture equipment data, tie trend data to assets, generate savings recommendations
- **Vision Alignment**: Vendor-agnostic asset management, code-knowledge-based optimization, scalable expertise

### Calculator
- **Purpose**: Physics-based calculations for battery, HVAC, lighting
- **Vision Alignment**: Accuracy first, provable results, vendor-agnostic inputs

### Monitoring (Coming Soon)
- **Purpose**: Real-time performance tracking
- **Vision Alignment**: Vendor-agnostic integration, learns from telemetry, provides proof

## Integration Guidelines

### Vendor-Agnostic Integration

```typescript
// ✅ GOOD: Universal protocol
interface BACnetIntegration {
  protocol: 'BACnet';
  endpoint: string;
}

// ✅ GOOD: REST API
interface RESTIntegration {
  protocol: 'REST';
  endpoint: string;
  auth: 'OAuth2' | 'APIKey';
}

// ❌ BAD: Vendor-specific
interface SiemensSpecificIntegration {
  protocol: 'SiemensProprietary';
  // This creates lock-in!
}
```

### Provable Results

```typescript
// ✅ GOOD: Audit trail
interface OptimizationChange {
  timestamp: Date;
  assetId: string;
  change: string;
  reason: string;
  expectedSavings: number;
  actualSavings?: number; // Tracked over time
}

// ✅ GOOD: M&V-grade reporting
interface SavingsReport {
  baseline: EnergyProfile;
  optimized: EnergyProfile;
  savings: number;
  confidence: number;
  methodology: 'IPMVP' | 'ASHRAE' | 'Custom';
}
```

## Common Patterns

### Learning from Data

```typescript
// Pattern: Learn from telemetry, optimize based on patterns
function optimizeHVAC(telemetry: TelemetryData): OptimizationRecommendation {
  // Analyze patterns
  const patterns = detectPatterns(telemetry);
  
  // Identify waste
  const waste = identifyWaste(patterns);
  
  // Generate recommendations
  return generateRecommendations(waste, patterns);
}
```

### Encoding Expert Knowledge

```typescript
// Pattern: Encode expert rules into code
const EXPERT_RULES = {
  simultaneousHeatCool: {
    detect: (temps: TemperatureData) => /* expert logic */,
    optimize: () => /* expert solution */,
    savings: calculateSavings
  },
  huntingValves: {
    detect: (valveData: ValveData) => /* expert logic */,
    optimize: () => /* expert solution */,
    savings: calculateSavings
  }
};
```

## Testing Vision Alignment

```typescript
import { checkAlignment, SIX_PILLARS } from '@core/vision';

describe('New Feature', () => {
  it('should align with core vision', () => {
    const alignment = checkAlignment({
      vendorAgnostic: true,
      providesProof: true,
      scalesExpertise: true,
      avoidsLockIn: true,
      learnsFromData: true
    });
    
    expect(alignment.aligned).toBe(true);
    expect(alignment.issues).toHaveLength(0);
  });
});
```

## Resources

- **Core Vision**: [EVERWATT_AI_CORE_VISION.md](./EVERWATT_AI_CORE_VISION.md)
- **Contributing Guide**: [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Engineering Manifesto**: [src/project-manifesto.md](./src/project-manifesto.md)
- **Vision Constants**: `src/core/vision.ts`

---

**Remember**: The core vision is the guiding compass. When in doubt, refer to it.

