# EverWatt.AI - Next Steps Action Plan

> **Aligned with Core Vision**: This plan prioritizes features that support vendor-agnostic optimization, provable results, and scalable expertise.

Based on research and codebase analysis, here's the prioritized roadmap to advance EverWatt.AI toward its vision.

---

## 🎯 Phase 1: Foundation for Vendor-Agnostic Integration (Weeks 1-4)

### Priority 1.1: BMS/EMS Integration Layer ⚡ CRITICAL

**Why**: Core to vendor-agnostic vision - must work with any system

**What to Build**:
- Universal protocol abstraction layer
- BACnet integration (most common BMS protocol)
- Modbus RTU/TCP integration (industrial systems)
- REST API connector (modern systems like Ignition, Niagara)
- OPC-UA connector (enterprise systems)

**Implementation**:
```
src/modules/integration/
├── protocols/
│   ├── bacnet/
│   │   ├── bacnet-client.ts
│   │   ├── bacnet-reader.ts
│   │   └── bacnet-writer.ts
│   ├── modbus/
│   │   ├── modbus-client.ts
│   │   └── modbus-reader.ts
│   ├── rest/
│   │   ├── rest-connector.ts
│   │   └── api-adapters/
│   └── opcua/
│       └── opcua-client.ts
├── abstraction/
│   ├── unified-interface.ts  # Vendor-agnostic API
│   ├── data-mapper.ts         # Map vendor data to unified format
│   └── command-executor.ts   # Execute commands across protocols
└── types.ts
```

**Key Features**:
- Read: temperatures, flows, statuses, kW, demand
- Write: setpoints, schedules, control commands
- Subscribe: real-time updates
- Vendor-agnostic data model

**Research Needed**:
- BACnet.js or node-bacnet library
- modbus-serial or node-modbus
- OPC-UA client libraries

---

### Priority 1.2: M&V Reporting Framework 📊 CRITICAL

**Why**: Core to "provable results" - utilities and CFOs need this

**What to Build**:
- IPMVP (International Performance Measurement & Verification Protocol) compliance
- Baseline vs. optimized comparison
- Savings attribution with confidence intervals
- Audit trail of all changes
- Utility-program-ready documentation

**Implementation**:
```
src/modules/mv/
├── ipmvp/
│   ├── option-a.ts  # Retrofit isolation
│   ├── option-b.ts   # Whole facility
│   ├── option-c.ts  # Calibrated simulation
│   └── option-d.ts  # Measurement & verification
├── reporting/
│   ├── baseline-establishment.ts
│   ├── savings-calculation.ts
│   ├── uncertainty-analysis.ts
│   └── report-generator.ts
├── audit-trail/
│   ├── change-logger.ts
│   ├── attribution.ts
│   └── verification.ts
└── types.ts
```

**Key Features**:
- Establish baseline (pre-optimization)
- Track all optimization changes with timestamps
- Calculate savings with statistical confidence
- Generate M&V reports (PDF/Excel)
- Support IPMVP Options A, B, C, D

**Standards to Follow**:
- IPMVP Volume I (2014)
- ASHRAE Guideline 14
- FEMP M&V Guidelines

---

### Priority 1.3: Enhanced Audit Module - Asset-to-Trend Connection 🔗 HIGH

**Why**: Core capability mentioned in vision - tie trend data to assets

**What to Build**:
- Connect equipment assets to real-time trend data
- Asset performance tracking
- Historical trend analysis per asset
- Automatic savings generation based on code knowledge

**Implementation**:
```
src/modules/audit/
├── asset-management/
│   ├── asset-registry.ts      # Equipment database
│   ├── trend-connector.ts     # Link assets to BMS points
│   ├── performance-tracker.ts  # Track asset performance
│   └── code-analyzer.ts        # ASHRAE 90.1, Title 24 analysis
├── optimization-detector/
│   ├── waste-identifier.ts    # Simultaneous heat/cool, etc.
│   ├── opportunity-finder.ts  # Optimization opportunities
│   └── savings-calculator.ts  # Generate savings estimates
└── types.ts
```

**Key Features**:
- Asset registry with nameplate data
- Map BMS points to assets (e.g., "Chiller-1 Supply Temp" → Asset ID)
- Track performance metrics per asset
- Compare actual vs. code-compliant performance
- Auto-generate optimization recommendations
- Calculate savings based on code standards

---

## 🚀 Phase 2: Continuous Optimization Engine (Weeks 5-8)

### Priority 2.1: Learning & Pattern Recognition 🧠 HIGH

**Why**: Core to "learns from building data" vision

**What to Build**:
- Pattern detection from telemetry data
- Waste identification algorithms
- Predictive optimization recommendations
- Continuous improvement loop

**Implementation**:
```
src/modules/optimization/
├── learning/
│   ├── pattern-detector.ts    # Detect usage patterns
│   ├── waste-identifier.ts    # Find simultaneous heat/cool, etc.
│   ├── anomaly-detector.ts    # Detect unusual behavior
│   └── predictor.ts           # Predict optimal settings
├── rules-engine/
│   ├── expert-rules.ts        # Encode expert knowledge
│   ├── optimization-rules.ts  # Optimization strategies
│   └── safety-rules.ts        # Safety constraints
└── types.ts
```

**Key Features**:
- Detect simultaneous heating/cooling
- Identify hunting valves
- Flag oversized equipment
- Detect bad sequencing
- Learn optimal setpoints over time
- Predict maintenance needs

---

### Priority 2.2: Real-Time Control & Dispatch 🎛️ HIGH

**Why**: Core to "continuously tune" vision

**What to Build**:
- Real-time optimization engine
- Safe control command dispatch
- Setpoint optimization
- Schedule optimization

**Implementation**:
```
src/modules/control/
├── optimizer/
│   ├── setpoint-optimizer.ts
│   ├── schedule-optimizer.ts
│   └── dispatch-engine.ts
├── safety/
│   ├── constraint-checker.ts
│   ├── rollback-manager.ts
│   └── alarm-handler.ts
└── types.ts
```

**Key Features**:
- Optimize setpoints in real-time
- Adjust schedules based on occupancy/weather
- Dispatch control commands safely
- Rollback on errors
- Respect safety constraints

---

## 📈 Phase 3: Business Model Enablement (Weeks 9-12)

### Priority 3.1: Portfolio Management 🌐 MEDIUM

**Why**: Enable "portfolio-wide optimization" business model

**What to Build**:
- Multi-site management
- Portfolio-level analytics
- Cross-site optimization
- Centralized reporting

### Priority 3.2: Subscription & Performance Contracts 💼 MEDIUM

**Why**: Enable ongoing business models

**What to Build**:
- Subscription management
- Performance contract tracking
- Guaranteed savings monitoring
- Automated billing integration

---

## 🔧 Technical Infrastructure (Ongoing)

### Infrastructure Needs

1. **Time-Series Database**
   - For storing telemetry data
   - Options: InfluxDB, TimescaleDB, or cloud (AWS Timestream)
   - Handle 35k+ points per building per year

2. **Message Queue**
   - For async processing
   - Options: RabbitMQ, Redis Streams, AWS SQS
   - Handle real-time optimization commands

3. **API Gateway**
   - Unified API for all integrations
   - Rate limiting, authentication
   - Protocol translation

4. **Monitoring & Alerting**
   - System health monitoring
   - Performance metrics
   - Alert on optimization failures

---

## 📚 Research & Standards

### Protocols to Support

1. **BACnet** (Building Automation and Control Networks)
   - Most common BMS protocol
   - Library: `bacnet` npm package or `node-bacnet`

2. **Modbus**
   - Industrial systems
   - Library: `modbus-serial` or `node-modbus`

3. **REST APIs**
   - Ignition, Niagara, modern systems
   - Custom adapters per vendor

4. **OPC-UA**
   - Enterprise systems
   - Library: `node-opcua`

### Standards to Follow

1. **IPMVP** - Measurement & Verification
2. **ASHRAE 90.1** - Energy Standard
3. **ASHRAE Guideline 14** - M&V Guidelines
4. **BACnet Standard** - ANSI/ASHRAE 135

---

## 🎯 Immediate Next Steps (This Week)

### Step 1: Research & Design
- [ ] Research BACnet.js and Modbus libraries
- [ ] Design unified integration interface
- [ ] Design M&V reporting structure
- [ ] Design asset-to-trend connection schema

### Step 2: Proof of Concept
- [ ] Build simple BACnet reader (read one point)
- [ ] Build simple Modbus reader
- [ ] Create M&V baseline establishment demo
- [ ] Create asset-to-trend connection demo

### Step 3: Core Implementation
- [ ] Implement unified integration layer
- [ ] Implement M&V framework
- [ ] Enhance audit module with trend connection
- [ ] Build optimization detection algorithms

---

## 📊 Success Metrics

### Phase 1 Success
- ✅ Can connect to at least 3 different BMS systems (BACnet, Modbus, REST)
- ✅ Can establish M&V baseline and calculate savings
- ✅ Audit module connects assets to trend data
- ✅ System generates optimization recommendations

### Phase 2 Success
- ✅ System learns patterns from telemetry
- ✅ Identifies waste automatically
- ✅ Optimizes setpoints in real-time
- ✅ Provides audit trail of all changes

### Phase 3 Success
- ✅ Supports multi-site portfolios
- ✅ Enables subscription business model
- ✅ Tracks performance contracts
- ✅ Scales to 100+ buildings

---

## 🚨 Critical Dependencies

1. **BMS Access**: Need test sites with BACnet/Modbus access
2. **Standards Documentation**: IPMVP, ASHRAE guidelines
3. **Library Selection**: Choose stable, maintained libraries
4. **Testing**: Need test environments for each protocol

---

## 📖 Resources

### Documentation
- IPMVP Volume I (2014): https://evo-world.org/
- ASHRAE 90.1: https://www.ashrae.org/
- BACnet Standard: ANSI/ASHRAE 135

### Libraries
- BACnet: `bacnet` npm package
- Modbus: `modbus-serial` npm package
- OPC-UA: `node-opcua` npm package

### Communities
- BACnet International
- Building Automation forums
- Energy efficiency communities

---

**Remember**: Every feature must align with the core vision:
- ✅ Vendor-agnostic
- ✅ Provable results
- ✅ Scales expertise
- ✅ Learns from data
- ✅ Enables new business models

---

*This plan is a living document. Update as we learn and build.*

