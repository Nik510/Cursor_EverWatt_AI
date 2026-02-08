# Quick Vision Reference

> **The Core Truth**: EverWatt.AI is a plug-and-play, vendor-agnostic optimization layer that learns from building data to continuously reduce energy and demand—at scale—with provable results.

## Canonical Document

- **Canonical Core Vision / North Star**: [EVERWATT_AI_CORE_VISION.md](./EVERWATT_AI_CORE_VISION.md)

## The Six Pillars

1. **Deeper Savings** - Continuously tune HVAC, VFDs, and other big loads for maximum efficiency
2. **Vendor-Agnostic** - Integrate with anything (Ignition, Niagara, BACnet, Siemens, Johnson Controls, etc.)
3. **Learn & Improve** - Use telemetry + learning to improve performance over time
4. **Scale Expertise** - Encode expert knowledge into repeatable logic
5. **Provide Proof** - M&V-grade reporting that utilities and CFOs accept
6. **Enable Business Models** - Ongoing performance contracts, monitoring subscriptions, portfolio optimization

## Quick Alignment Check

Before implementing any feature, ask:
- ✅ Vendor-agnostic? (Works with any BMS/EMS?)
- ✅ Provable results? (M&V-grade reporting?)
- ✅ Scales expertise? (Encodes expert knowledge?)
- ✅ Avoids lock-in? (No proprietary dependencies?)
- ✅ Learns from data? (Uses telemetry data?)

## Code Usage

```typescript
import { checkAlignment, CORE_MISSION, SIX_PILLARS } from '@core/vision';

// Check feature alignment
const alignment = checkAlignment({
  vendorAgnostic: true,
  providesProof: true,
  scalesExpertise: true,
  avoidsLockIn: true,
  learnsFromData: true
});
```

## Full Documentation

- **Canonical Core Vision / North Star**: [EVERWATT_AI_CORE_VISION.md](./EVERWATT_AI_CORE_VISION.md)
- **Developer Guide**: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
- **Contributing**: [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Remember**: The vision is the guiding compass. When in doubt, refer to it.

