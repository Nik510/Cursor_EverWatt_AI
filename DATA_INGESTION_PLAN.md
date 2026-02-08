# Data Ingestion & Organization Plan

## Understanding the Scope

You mentioned you've compiled extensive training data for the system to **store, learn, sort, and organize**. This document outlines how we'll ingest and structure all that data.

## Current Data Inventory

### What We Know Exists:
1. **Battery Catalog** - `BATTERY_CATALOG.csv`
2. **Training Data Folder** - `C:\Users\nikjo\OneDrive\Desktop\EverWatt_Engine\EVERWATT AI\TRAINING_DATA`
3. **Knowledge Base Content** - Equipment specs, measures, verticals
4. **Training App Content** - UI components, training modules
5. **HVAC Audit Content** - Audit forms, equipment data

### What We've Built:
- ✅ Training content structure (7 technologies)
- ✅ Knowledge base structure (200+ measures, equipment, verticals)
- ✅ Battery catalog loader
- ✅ Equipment library
- ✅ Measures library

### What Needs Ingestion:
- 📥 Full battery catalog data
- 📥 Additional training content from training app
- 📥 HVAC equipment specifications
- 📥 Utility rate structures
- 📥 Rebate programs
- 📥 Technical documentation
- 📥 Real-world case studies

---

## Data Organization Strategy

### 1. **Static Reference Data** (Large, Rarely Changes)

Store as **optimized JSON/TypeScript files** or **database tables**:

```
src/data/
├── batteries/
│   ├── catalog.json          # Full battery catalog
│   └── specifications/        # Detailed specs per model
├── equipment/
│   ├── hvac/                 # HVAC equipment specs
│   ├── lighting/             # Lighting equipment specs
│   └── controls/             # Control system specs
├── utilities/
│   ├── rate-structures/      # Utility rate data
│   └── rebates/              # Rebate program data
└── technical/
    ├── standards/            # Engineering standards
    └── documentation/        # Technical docs
```

### 2. **Training Content** (Structured, Searchable)

Store in **database with full-text search**:

```
database.training_content
- id
- technology (lighting, hvac, battery, etc.)
- title
- content (JSON with sections, schematics, etc.)
- metadata (tags, categories, related items)
- search_vector (for full-text search)
```

### 3. **Knowledge Base** (Relationships & Cross-References)

Store in **relational database**:

```
database.knowledge_base
- measures (with relationships)
- equipment (with specifications)
- verticals (with market profiles)
- cross_references (measure <-> equipment <-> vertical)
```

---

## Large Dataset Handling

### Strategy 1: **Lazy Loading & Pagination**

Don't load everything at once. Load on demand:

```typescript
// Instead of loading all batteries
const allBatteries = loadBatteryCatalog(); // ❌ Loads everything

// Load with pagination
async function getBatteries(page: number, limit: number) {
  // Load only what's needed
  return await db.query(
    'SELECT * FROM battery_catalog LIMIT $1 OFFSET $2',
    [limit, page * limit]
  );
}
```

### Strategy 2: **Search & Filter at Database Level**

Don't filter in memory. Use database queries:

```typescript
// ❌ Bad: Load all, filter in memory
const all = loadAllBatteries();
const filtered = all.filter(b => b.capacity > 100);

// ✅ Good: Filter in database
const filtered = await db.query(
  'SELECT * FROM battery_catalog WHERE capacity_kwh > $1',
  [100]
);
```

### Strategy 3: **Indexing for Performance**

Create indexes on frequently searched fields:

```sql
CREATE INDEX idx_battery_capacity ON battery_catalog(capacity_kwh);
CREATE INDEX idx_battery_manufacturer ON battery_catalog(manufacturer);
CREATE INDEX idx_equipment_type ON equipment(type);
CREATE INDEX idx_measure_category ON measures(category);
```

### Strategy 4: **Caching Frequently Used Data**

Cache reference data that doesn't change often:

```typescript
// Cache training content
const trainingCache = new Map();
function getTrainingContent(techId: string) {
  if (!trainingCache.has(techId)) {
    trainingCache.set(techId, loadTrainingContent(techId));
  }
  return trainingCache.get(techId);
}
```

---

## Data Ingestion Pipeline

### Phase 1: Inventory & Catalog

1. **Scan training data folder**
   - List all files
   - Categorize by type
   - Identify data formats

2. **Create data catalog**
   - Document what exists
   - Note file formats
   - Identify relationships

### Phase 2: Import & Transform

1. **Battery Catalog**
   - ✅ Already have loader
   - Import to database
   - Add metadata

2. **Training Content**
   - Parse existing training modules
   - Extract structured data
   - Import to database

3. **Equipment Specs**
   - Extract from documentation
   - Structure as JSON
   - Import to database

4. **Utility Rates**
   - Parse rate schedules
   - Structure for calculations
   - Import to database

### Phase 3: Relationships & Cross-References

1. **Link measures to equipment**
2. **Link equipment to training content**
3. **Link measures to verticals**
4. **Build search index**

### Phase 4: Optimization

1. **Add indexes**
2. **Implement caching**
3. **Optimize queries**
4. **Add full-text search**

---

## Database Schema for Large Datasets

```sql
-- Batteries (can be thousands)
CREATE TABLE battery_catalog (
  id SERIAL PRIMARY KEY,
  manufacturer VARCHAR(255),
  model_name VARCHAR(255),
  -- ... specs ...
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_manufacturer (manufacturer),
  INDEX idx_capacity (capacity_kwh),
  FULLTEXT INDEX idx_search (manufacturer, model_name)
);

-- Training Content (can be hundreds of articles)
CREATE TABLE training_content (
  id SERIAL PRIMARY KEY,
  technology VARCHAR(50),
  title VARCHAR(255),
  content JSONB, -- Flexible structure
  metadata JSONB, -- Tags, categories, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_technology (technology),
  FULLTEXT INDEX idx_content (title, content)
);

-- Equipment (can be thousands of models)
CREATE TABLE equipment (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50),
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  specifications JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_type (type),
  INDEX idx_manufacturer (manufacturer),
  FULLTEXT INDEX idx_search (manufacturer, model)
);
```

---

## Next Steps

### Immediate Actions:

1. **Inventory Your Data**
   - List all files in TRAINING_DATA folder
   - Identify formats (CSV, Excel, PDF, JSON, etc.)
   - Note file sizes

2. **Create Data Import Scripts**
   - Script to scan and catalog files
   - Script to import to database
   - Script to build relationships

3. **Set Up Database**
   - PostgreSQL instance
   - Schema creation
   - Index creation

### I Can Help You:

1. **Scan your training data folder** and create an inventory
2. **Write import scripts** for each data type
3. **Build database schema** optimized for your data
4. **Create API endpoints** for efficient data access
5. **Implement search functionality** across all data

---

## Questions to Answer:

1. **What formats is your training data in?** (CSV, Excel, PDF, JSON, etc.)
2. **Approximately how much data?** (file sizes, record counts)
3. **What relationships exist?** (equipment → measures, measures → training, etc.)
4. **How often does data update?** (static vs. dynamic)
5. **What's the primary use case?** (search, browse, calculations, reporting)

Would you like me to:
1. Create a script to scan your training data folder and inventory everything?
2. Build database import scripts for the data?
3. Set up the database schema for efficient storage and retrieval?

