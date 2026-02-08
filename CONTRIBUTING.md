# Contributing to EverWatt.AI

## Core Vision Alignment

**Before contributing, please read [EVERWATT_AI_CORE_VISION.md](./EVERWATT_AI_CORE_VISION.md).**

All contributions must align with the core vision:
- ✅ Vendor-agnostic (no proprietary lock-in)
- ✅ Provable results (M&V-grade reporting)
- ✅ Scalable expertise (encode expert knowledge)
- ✅ Learn from data (telemetry + learning)
- ✅ Enable new business models

## Development Principles

### Alignment Check

Before implementing any feature, verify:

1. **Vendor-Agnostic?** Does this work with any BMS/EMS system, or does it create dependencies?
2. **Provable Results?** Can we provide M&V-grade proof of savings with audit trails?
3. **Scales Expertise?** Does this encode expert knowledge into repeatable logic?
4. **Avoids Lock-In?** Does this avoid proprietary protocols or vendor-specific dependencies?
5. **Learns from Data?** Does this use telemetry data to improve over time?

### What We DON'T Do

- ❌ Create proprietary protocols that lock customers in
- ❌ Depend on specific vendor ecosystems
- ❌ Simplify physics for convenience (accuracy first)
- ❌ Build features that can't scale nationwide
- ❌ Ignore data quality or validation

### What We ALWAYS Do

- ✅ Use universal interfaces (BACnet, Modbus, REST APIs)
- ✅ Provide audit trails and proof of savings
- ✅ Encode expert knowledge into repeatable logic
- ✅ Learn from telemetry data
- ✅ Enable new business models beyond one-time projects

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Follow existing patterns and conventions
- Export types and interfaces for reuse

### Physics & Calculations

- **Accuracy First**: Complex physics equations are implemented fully, not simplified
- All formulas must be traceable to engineering standards
- Document mathematical models in code comments

### Integration

- Use universal protocols (BACnet, Modbus, REST APIs)
- Never create vendor-specific dependencies
- Design for vendor-agnostic deployment

## Testing

- Write tests for calculation accuracy
- Validate against engineering standards
- Test with multiple vendor systems when applicable

## Documentation

- Update relevant documentation when adding features
- Reference the core vision in new modules
- Document integration points and protocols

## Questions?

If you're unsure whether a feature aligns with the core vision, please:
1. Review [EVERWATT_AI_CORE_VISION.md](./EVERWATT_AI_CORE_VISION.md)
2. Check the alignment checklist above
3. Ask in discussions or issues

---

**Remember**: The core vision is the guiding compass. When in doubt, refer to it.

