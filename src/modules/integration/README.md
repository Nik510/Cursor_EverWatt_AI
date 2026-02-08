# BMS Integration Module

Vendor-agnostic integration layer for Building Management Systems (BMS) and Energy Management Systems (EMS).

## Overview

This module provides a **unified, vendor-agnostic interface** for connecting to any BMS/EMS system, regardless of the underlying protocol (BACnet, Modbus, REST, OPC-UA).

## Core Principle

**Vendor-Agnostic**: The rest of EverWatt.AI should never know about BACnet, Modbus, or any specific protocol. All interactions go through the `UnifiedBMSInterface`.

## Architecture

```
EverWatt.AI Application
         ↓
UnifiedBMSInterface (vendor-agnostic API)
         ↓
Protocol Adapters (BACnet, Modbus, REST, OPC-UA)
         ↓
BMS/EMS Systems
```

## Quick Start

```typescript
import { UnifiedBMSInterface } from '@integration';

// Create interface
const bms = new UnifiedBMSInterface();

// Add BACnet connection
await bms.addConnection({
  id: 'building-1-hvac',
  name: 'Building 1 HVAC System',
  protocol: 'bacnet',
  config: {
    deviceId: 1001,
    address: '192.168.1.100',
    port: 47808
  },
  enabled: true
});

// Read a point
const temp = await bms.readPoint({
  protocol: 'bacnet',
  connectionId: 'building-1-hvac',
  pointId: 'analog-input:1'
});

console.log(`Temperature: ${temp.value} ${temp.unit}`);

// Write a setpoint
await bms.writePoint({
  point: {
    protocol: 'bacnet',
    connectionId: 'building-1-hvac',
    pointId: 'analog-output:5'
  },
  value: 72.0,
  reason: 'Optimization: Reduce cooling setpoint'
});

// Subscribe to real-time updates
await bms.subscribe({
  id: 'temp-monitor',
  points: [/* point refs */],
  callback: (data) => {
    console.log('New data:', data);
  },
  interval: 5000
});
```

## Supported Protocols

### BACnet/IP
- Most common BMS protocol
- Used by: Siemens, Johnson Controls, Trane, Carrier, etc.
- **Status**: Framework ready, needs library integration

### Modbus
- Industrial systems
- Used by: Many industrial controllers
- **Status**: Framework ready, needs library integration

### REST APIs
- Modern systems
- Used by: Ignition, Niagara, custom systems
- **Status**: Framework ready, needs vendor-specific adapters

### OPC-UA
- Enterprise systems
- **Status**: Planned for future

## Implementation Status

- ✅ Core types and interfaces
- ✅ Unified interface API
- ✅ Base protocol adapter class
- ✅ BACnet adapter skeleton
- ⏳ BACnet library integration (needs `bacnet` npm package)
- ⏳ Modbus adapter
- ⏳ REST adapter
- ⏳ Point discovery
- ⏳ Safety constraints

## Next Steps

1. **Research BACnet library**: Test `bacnet` or `node-bacnet` npm packages
2. **Implement BACnet read/write**: Complete the BACnet adapter
3. **Test with simulator**: Use BACnet simulator for testing
4. **Add Modbus support**: Implement Modbus adapter
5. **Add REST support**: Implement REST adapter with vendor adapters

## Files

- `types.ts` - Core types and interfaces
- `unified-interface.ts` - Vendor-agnostic API
- `protocols/base-protocol.ts` - Base class for adapters
- `protocols/bacnet/` - BACnet adapter
- `protocols/modbus/` - Modbus adapter (to be created)
- `protocols/rest/` - REST adapter (to be created)

## See Also

- [BMS_INTEGRATION_ARCHITECTURE.md](../../../BMS_INTEGRATION_ARCHITECTURE.md) - Complete architecture documentation
- [EVERWATT_AI_CORE_VISION.md](../../../EVERWATT_AI_CORE_VISION.md) - Core vision

