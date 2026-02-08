# BMS Integration Layer Architecture

> **Aligned with Core Vision**: Vendor-agnostic, provable results, scalable expertise

This document outlines the complete architecture for building a vendor-agnostic BMS/EMS integration layer.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              EverWatt.AI Application Layer              │
│  (Optimization Engine, Analytics, Reporting)            │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│           Unified Integration Interface                 │
│  (Vendor-Agnostic API - Read/Write/Subscribe)          │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
│   BACnet     │ │  Modbus  │ │   REST     │
│   Adapter    │ │  Adapter │ │   Adapter  │
└───────┬──────┘ └────┬─────┘ └─────┬──────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              BMS/EMS Systems                            │
│  (Siemens, Johnson Controls, Ignition, Niagara, etc.)  │
└─────────────────────────────────────────────────────────┘
```

---

## Core Design Principles

### 1. Vendor-Agnostic Interface
- **Single API** for all protocols
- **Unified data model** regardless of source
- **Protocol abstraction** - upper layers don't know about BACnet/Modbus/etc.

### 2. Protocol Support
- **BACnet/IP** - Most common BMS protocol
- **Modbus RTU/TCP** - Industrial systems
- **REST APIs** - Modern systems (Ignition, Niagara, custom)
- **OPC-UA** - Enterprise systems (future)

### 3. Core Capabilities
- **Read**: Temperatures, flows, statuses, kW, demand
- **Write**: Setpoints, schedules, control commands
- **Subscribe**: Real-time updates via polling or push
- **Discovery**: Auto-discover available points

---

## Directory Structure

```
src/modules/integration/
├── types.ts                    # Core types and interfaces
├── unified-interface.ts         # Vendor-agnostic API
├── data-mapper.ts              # Map vendor data to unified format
├── command-executor.ts         # Execute commands safely
├── protocols/
│   ├── index.ts
│   ├── base-protocol.ts        # Base class for all protocols
│   ├── bacnet/
│   │   ├── bacnet-client.ts    # BACnet client implementation
│   │   ├── bacnet-reader.ts    # Read operations
│   │   ├── bacnet-writer.ts    # Write operations
│   │   └── bacnet-types.ts     # BACnet-specific types
│   ├── modbus/
│   │   ├── modbus-client.ts
│   │   ├── modbus-reader.ts
│   │   ├── modbus-writer.ts
│   │   └── modbus-types.ts
│   ├── rest/
│   │   ├── rest-connector.ts
│   │   ├── api-adapters/
│   │   │   ├── ignition-adapter.ts
│   │   │   ├── niagara-adapter.ts
│   │   │   └── generic-adapter.ts
│   │   └── rest-types.ts
│   └── opcua/                  # Future
│       └── opcua-client.ts
├── discovery/
│   ├── point-discovery.ts      # Auto-discover available points
│   └── device-discovery.ts      # Discover devices on network
├── caching/
│   ├── data-cache.ts           # Cache read values
│   └── subscription-manager.ts # Manage subscriptions
└── safety/
    ├── constraint-checker.ts   # Safety constraints
    ├── rollback-manager.ts     # Rollback on errors
    └── command-validator.ts    # Validate commands before execution
```

---

## Core Types & Interfaces

### Unified Data Model

```typescript
// src/modules/integration/types.ts

/**
 * Unified data point - vendor-agnostic representation
 */
export interface UnifiedDataPoint {
  id: string;                    // Unique identifier
  name: string;                  // Human-readable name
  value: number | boolean | string;
  unit: string;                  // '°F', 'kW', 'cfm', etc.
  timestamp: Date;
  quality: DataQuality;          // 'good', 'bad', 'uncertain'
  metadata?: {
    building?: string;
    system?: string;              // 'HVAC', 'Lighting', etc.
    equipment?: string;           // Asset ID from audit module
    location?: string;
  };
}

/**
 * Data point reference - how to access a point
 */
export interface DataPointReference {
  protocol: 'bacnet' | 'modbus' | 'rest' | 'opcua';
  connectionId: string;          // Which BMS connection
  pointId: string;               // Protocol-specific point ID
  // Protocol-specific details stored in adapter
}

/**
 * Command to write a value
 */
export interface WriteCommand {
  point: DataPointReference;
  value: number | boolean | string;
  timestamp?: Date;
  reason?: string;                // Why we're changing this (for audit trail)
}

/**
 * Subscription for real-time updates
 */
export interface Subscription {
  id: string;
  points: DataPointReference[];
  callback: (data: UnifiedDataPoint[]) => void;
  interval?: number;              // Polling interval in ms
}

/**
 * Connection configuration
 */
export interface BMSConnection {
  id: string;
  name: string;
  protocol: 'bacnet' | 'modbus' | 'rest' | 'opcua';
  config: BACnetConfig | ModbusConfig | RESTConfig | OPCUAConfig;
  enabled: boolean;
  lastConnected?: Date;
}

export interface BACnetConfig {
  deviceId: number;
  address: string;                // IP address
  port?: number;                 // Default 47808
  networkNumber?: number;
}

export interface ModbusConfig {
  type: 'tcp' | 'rtu';
  address: string;                // IP or serial port
  port?: number;                 // TCP port (default 502)
  unitId: number;
  timeout?: number;
}

export interface RESTConfig {
  baseUrl: string;
  adapter: 'ignition' | 'niagara' | 'generic';
  apiKey?: string;
  auth?: {
    type: 'basic' | 'bearer' | 'oauth2';
    credentials: any;
  };
}
```

---

## Unified Interface API

```typescript
// src/modules/integration/unified-interface.ts

/**
 * Vendor-agnostic BMS integration interface
 * 
 * This is the ONLY interface the rest of EverWatt.AI should use.
 * Protocol-specific details are hidden in adapters.
 */
export class UnifiedBMSInterface {
  /**
   * Read a single data point
   */
  async readPoint(ref: DataPointReference): Promise<UnifiedDataPoint>;

  /**
   * Read multiple data points
   */
  async readPoints(refs: DataPointReference[]): Promise<UnifiedDataPoint[]>;

  /**
   * Write a value to a point
   */
  async writePoint(command: WriteCommand): Promise<void>;

  /**
   * Write multiple values
   */
  async writePoints(commands: WriteCommand[]): Promise<void>;

  /**
   * Subscribe to real-time updates
   */
  async subscribe(subscription: Subscription): Promise<string>; // Returns subscription ID

  /**
   * Unsubscribe
   */
  async unsubscribe(subscriptionId: string): Promise<void>;

  /**
   * Discover available points
   */
  async discoverPoints(connectionId: string, filter?: DiscoveryFilter): Promise<UnifiedDataPoint[]>;

  /**
   * Get connection status
   */
  async getConnectionStatus(connectionId: string): Promise<ConnectionStatus>;
}
```

---

## Protocol Adapters

### Base Protocol Class

```typescript
// src/modules/integration/protocols/base-protocol.ts

/**
 * Base class for all protocol adapters
 * Ensures consistent interface across protocols
 */
export abstract class BaseProtocolAdapter {
  protected connection: BMSConnection;
  
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract readPoint(ref: DataPointReference): Promise<UnifiedDataPoint>;
  abstract writePoint(command: WriteCommand): Promise<void>;
  abstract discoverPoints(filter?: DiscoveryFilter): Promise<UnifiedDataPoint[]>;
  
  /**
   * Convert protocol-specific data to unified format
   */
  protected abstract toUnified(data: any): UnifiedDataPoint;
  
  /**
   * Convert unified format to protocol-specific
   */
  protected abstract fromUnified(command: WriteCommand): any;
}
```

### BACnet Adapter

```typescript
// src/modules/integration/protocols/bacnet/bacnet-client.ts

import { BaseProtocolAdapter } from '../base-protocol';
// Using bacnet npm package (need to research exact API)

export class BACnetAdapter extends BaseProtocolAdapter {
  private client: any; // BACnet client instance
  
  async connect(): Promise<void> {
    // Initialize BACnet client
    // Connect to BACnet device
  }
  
  async readPoint(ref: DataPointReference): Promise<UnifiedDataPoint> {
    // Read BACnet object (e.g., Analog Input)
    // Convert to unified format
  }
  
  async writePoint(command: WriteCommand): Promise<void> {
    // Write to BACnet object
    // Validate safety constraints
  }
  
  protected toUnified(bacnetData: any): UnifiedDataPoint {
    // Map BACnet object properties to unified format
  }
}
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

1. **Create directory structure**
   ```bash
   mkdir -p src/modules/integration/{protocols/{bacnet,modbus,rest},discovery,caching,safety}
   ```

2. **Define core types** (`types.ts`)
   - Unified data model
   - Connection configs
   - Command interfaces

3. **Create base protocol class**
   - Abstract interface
   - Common functionality

4. **Research libraries**
   - Test BACnet library (bacnet npm package)
   - Test Modbus library (modbus-serial)
   - Evaluate REST API patterns

### Phase 2: BACnet Implementation (Week 2)

1. **Install BACnet library**
   ```bash
   npm install bacnet
   ```

2. **Implement BACnet adapter**
   - Client connection
   - Read operations
   - Write operations
   - Error handling

3. **Test with real BACnet device** (if available)
   - Or use BACnet simulator

### Phase 3: Modbus Implementation (Week 2-3)

1. **Install Modbus library**
   ```bash
   npm install modbus-serial
   ```

2. **Implement Modbus adapter**
   - TCP and RTU support
   - Read/write operations

### Phase 4: REST Implementation (Week 3)

1. **Create REST connector**
   - Generic HTTP client
   - Authentication handling

2. **Build vendor adapters**
   - Ignition adapter
   - Niagara adapter
   - Generic adapter

### Phase 5: Unified Interface (Week 4)

1. **Implement UnifiedBMSInterface**
   - Route to correct adapter
   - Data mapping
   - Error handling

2. **Add caching layer**
   - Cache read values
   - Reduce BMS load

3. **Add subscription manager**
   - Polling for real-time updates
   - Push notifications (if supported)

### Phase 6: Safety & Discovery (Week 4)

1. **Safety constraints**
   - Validate commands
   - Check limits
   - Rollback on errors

2. **Point discovery**
   - Auto-discover available points
   - Map to unified format

---

## Library Research

### BACnet
- **Library**: `bacnet` (npm)
- **Alternative**: `node-bacnet`
- **Documentation**: Check npm package docs
- **Test**: Use BACnet simulator or real device

### Modbus
- **Library**: `modbus-serial` (npm)
- **Alternative**: `node-modbus`
- **Documentation**: https://github.com/yaacov/node-modbus-serial
- **Test**: Use Modbus simulator

### REST
- **Library**: Native `fetch` or `axios`
- **Pattern**: Custom adapters per vendor
- **Test**: Use vendor's API documentation

---

## Example Usage

```typescript
// Example: Reading temperature from BACnet system
import { UnifiedBMSInterface } from '@integration';

const bms = new UnifiedBMSInterface();

// Configure connection
await bms.addConnection({
  id: 'building-1-hvac',
  name: 'Building 1 HVAC System',
  protocol: 'bacnet',
  config: {
    deviceId: 1001,
    address: '192.168.1.100',
    port: 47808
  }
});

// Read a point
const temp = await bms.readPoint({
  protocol: 'bacnet',
  connectionId: 'building-1-hvac',
  pointId: 'analog-input:1' // BACnet object identifier
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
  reason: 'Optimization: Reduce cooling setpoint by 2°F'
});

// Subscribe to real-time updates
await bms.subscribe({
  id: 'temp-monitor',
  points: [/* point refs */],
  callback: (data) => {
    // Handle real-time updates
    console.log('New data:', data);
  },
  interval: 5000 // Poll every 5 seconds
});
```

---

## Integration with Existing Modules

### Audit Module
- Map BMS points to equipment assets
- Track performance per asset
- Generate savings recommendations

### Monitoring Module
- Real-time data display
- Historical trending
- Alerts and notifications

### Optimization Engine
- Read current state
- Calculate optimal setpoints
- Write optimized values
- Track changes for M&V

---

## Security Considerations

1. **Network Security**
   - Isolate BMS network
   - Use VPN if remote
   - Firewall rules

2. **Authentication**
   - API keys for REST
   - BACnet device passwords
   - Role-based access

3. **Command Validation**
   - Check safety limits
   - Validate ranges
   - Log all writes

4. **Error Handling**
   - Graceful degradation
   - Rollback on errors
   - Alert on failures

---

## Testing Strategy

1. **Unit Tests**
   - Test each adapter
   - Test data mapping
   - Test error handling

2. **Integration Tests**
   - Test with simulators
   - Test unified interface
   - Test subscriptions

3. **End-to-End Tests**
   - Test with real BMS (if available)
   - Test optimization workflows
   - Test M&V integration

---

## Next Steps

1. **Research libraries** - Test BACnet and Modbus npm packages
2. **Create proof of concept** - Simple BACnet reader
3. **Design data model** - Finalize unified types
4. **Build first adapter** - Start with BACnet
5. **Test and iterate** - Refine based on testing

---

**Remember**: This must remain vendor-agnostic. No protocol-specific code should leak into upper layers.

