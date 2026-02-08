# EverWatt Engine - Ecosystem Architecture

## Overview

The EverWatt Engine is built as a **modular ecosystem** where each major module can operate independently or be deployed to separate servers for optimal performance. This architecture ensures that heavy computational tasks don't impact user-facing features, and allows for horizontal scaling.

## Core Modules

### 1. AI Engineer Assistant
**Purpose**: Bridge the training gap between sales and engineering  
**Status**: Active  
**Technology**: AI-powered training content, interactive learning  
**Deployment**: Can run on separate server for AI model processing

**Features**:
- Technology Explorer with comprehensive training content
- Interactive schematics and visual learning
- AI Chat (coming soon) for instant engineering guidance
- Equipment identification guides
- Sales-to-engineering training pathways

### 2. Audit & Assessment
**Purpose**: Site data collection and equipment documentation  
**Status**: Beta  
**Technology**: Form-based data capture, photo upload, equipment library integration  
**Deployment**: Can be deployed separately for field use

**Features**:
- Equipment photography with automatic identification
- Structured data forms for HVAC, lighting, building data
- Equipment library reference
- Integration with Calculator and Reports modules

### 3. Live Monitoring
**Purpose**: Real-time performance tracking and analytics  
**Status**: Coming Soon  
**Technology**: Real-time data streaming, WebSocket connections, API integrations  
**Deployment**: **Separate server recommended** - High-frequency data processing

**Features**:
- Connect to lighting control systems
- HVAC system monitoring
- Battery storage performance tracking
- Preventive maintenance alerts
- Analytics and anomaly detection

### 4. Energy Solutions Calculator
**Purpose**: Smart analysis and technology selection  
**Status**: Active  
**Technology**: Battery sizing, HVAC optimization, lighting retrofit calculations  
**Deployment**: Can run on separate server for heavy compute

**Sub-calculators**:
- Battery Storage Calculator (Active)
- HVAC Optimization Calculator (Coming Soon)
- Lighting Retrofit Calculator (Coming Soon)

**Features**:
- Step-by-step analysis workflows
- File upload (CSV/Excel) for interval data
- Battery catalog integration
- Savings calculations and ROI analysis
- Integration with Audit data

### 5. Report Generator
**Purpose**: Professional documentation and reporting  
**Status**: Beta  
**Technology**: Report templating, PDF/Excel export, data visualization  
**Deployment**: Can run separately for document generation

**Report Types**:
- Energy Models (ASHRAE-compliant)
- Regression Analysis
- Savings Calculations (NPV, IRR, Payback)
- Proposals

**Features**:
- Data integration from Audit and Calculator modules
- Professional templates
- Multiple export formats (PDF, Excel, Word)
- Shareable digital reports

## Architecture Principles

### 1. Modular Monolith
- All modules in single codebase initially
- Clear module boundaries
- API-first design for future separation

### 2. Data Integration
- Shared data layer / API
- Audit → Calculator → Reports workflow
- Common data models and types

### 3. Scalability
- Modules can be extracted to separate services
- Independent scaling based on load
- Heavy compute (calculators, monitoring) separate from UI-heavy (training, audit)

### 4. API-First Design
- All modules expose APIs
- Internal communication via APIs
- External integrations supported

## Data Flow

```
Audit Module
    ↓
    Captures building/equipment data
    ↓
Calculator Module
    ↓
    Processes data, runs simulations
    ↓
Report Generator
    ↓
    Creates professional documentation
```

## Future Separation Strategy

### Phase 1: Current State
- All modules in single application
- Shared frontend and backend

### Phase 2: API Separation
- Backend APIs extracted to separate services
- Frontend remains unified
- API Gateway for routing

### Phase 3: Full Microservices
- Each module as independent service
- Separate databases if needed
- Service mesh for communication

## Module Communication

### Internal (Current)
- Direct function calls
- Shared state management
- Common data models

### External (Future)
- REST APIs
- WebSocket for real-time (Monitoring)
- Message queues for async processing
- Event-driven architecture

## Technology Stack

### Frontend
- React + TypeScript
- React Router for navigation
- Tailwind CSS for styling
- Vite for build tooling

### Backend
- Hono (high-performance API framework)
- TypeScript
- Node.js

### Future Additions
- AI/ML models for Engineer Assistant
- Time-series database for Monitoring
- Report generation engine
- File processing for Audit

## Deployment Options

### Option 1: Unified Deployment
- All modules in single server
- Simplest to start
- Good for MVP

### Option 2: Strategic Separation
- Monitoring on separate server (high-frequency data)
- Calculators on separate server (heavy compute)
- UI modules (Training, Audit) together
- Reports on separate server (document generation)

### Option 3: Full Microservices
- Each module independently deployable
- Maximum scalability
- Most complex operations

## Module Status

| Module | Status | Deployment Recommendation |
|--------|--------|---------------------------|
| AI Engineer Assistant | Active | Can separate if AI models are large |
| Audit | Beta | Can stay with main app |
| Monitoring | Coming Soon | **Separate server** (high-frequency data) |
| Calculator | Active | **Consider separation** (heavy compute) |
| Reports | Beta | Can separate for document generation |

## Getting Started

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Start API Server** (separate terminal)
   ```bash
   npm run dev:server
   ```

3. **Access Application**
   - Frontend: http://localhost:5173
   - API: http://localhost:3001

## Module Entry Points

- `/` - Module Hub (Landing Page)
- `/ai-engineer` - AI Engineer Assistant
- `/audit` - Audit & Assessment
- `/monitoring` - Live Monitoring
- `/calculator` - Energy Solutions Calculator
- `/reports` - Report Generator

## Integration Points

### Audit → Calculator
- Building load profiles
- Equipment specifications
- Utility rate information

### Calculator → Reports
- Savings calculations
- Financial analysis (NPV, IRR)
- Technology recommendations

### Monitoring → Reports
- Performance data
- Verification of savings
- Ongoing analytics

---

*This architecture is designed to grow with your needs. Start unified, separate when needed.*

