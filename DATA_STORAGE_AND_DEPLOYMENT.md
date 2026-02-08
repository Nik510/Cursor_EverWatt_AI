# Data Storage & Production Deployment Guide

## Current Data Storage Architecture

### 1. **Static Content (TypeScript Files)**

All training and knowledge base data is currently stored as **static TypeScript files**:

```
src/data/
├── training/              # Training content (7 technologies)
│   ├── lighting-content.ts
│   ├── chiller-content.ts
│   ├── boiler-content.ts
│   ├── vrf-content.ts
│   ├── vfd-content.ts
│   ├── battery-content.ts
│   └── cooling-tower-content.ts
│
└── knowledge-base/        # Knowledge base data
    ├── master-measures.ts        # 200+ energy efficiency measures
    ├── equipment-library.ts      # Equipment specifications
    └── verticals.ts              # Vertical market profiles
```

**Pros:**
- Fast, no database queries
- Version controlled
- Easy to edit
- Type-safe

**Cons:**
- Requires code deployment to update
- All data loaded at startup
- Not user-editable via UI

### 2. **Battery Catalog (CSV File)**

Currently stored in external directory:
```
C:\Users\nikjo\OneDrive\Desktop\EverWatt_Engine\TRAINING_DATA\BATTERY_CATALOG\BATTERY_CATALOG.csv
```

**Issue:** Hardcoded absolute path - won't work in production!

### 3. **User-Generated Data**

Currently processed in memory (temporary):
- Interval data files (CSV/Excel)
- Monthly bills
- Analysis results
- Generated reports

**Stored:** Nowhere - lost after session

---

## Production Data Architecture Options

### Option 1: **Hybrid Approach (Recommended for MVP)**

Keep static content as-is, add database for dynamic data.

```
┌─────────────────────────────────────────┐
│  Static Content (Git/Codebase)         │
│  - Training content                     │
│  - Knowledge base                       │
│  - Base equipment specs                 │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Database (PostgreSQL/MongoDB)          │
│  - Battery catalog (from CSV import)    │
│  - User projects                        │
│  - Analysis results                     │
│  - Generated reports                    │
│  - User uploads (interval data)         │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  File Storage (S3/Cloud Storage)        │
│  - User-uploaded files                  │
│  - Generated reports (PDF/Excel)        │
│  - Project documents                    │
└─────────────────────────────────────────┘
```

### Option 2: **Full Database Migration**

Move everything to database for dynamic updates.

### Option 3: **Headless CMS Integration**

Use Contentful, Strapi, or Sanity for content management.

---

## Recommended Production Stack

### Database: PostgreSQL

**Why:**
- Relational data (projects, users, batteries)
- JSONB for flexible schema (knowledge base)
- Excellent performance
- Free tier available (Supabase, Neon, Railway)

### File Storage: AWS S3 / Cloudflare R2

**Why:**
- Scalable file storage
- CDN integration
- Low cost
- Direct uploads from frontend

### Hosting Options

#### Option A: **Vercel (Frontend) + Railway (Backend + DB)**

**Frontend (Vercel):**
- Free tier available
- Automatic deployments from Git
- Edge network
- Zero config

**Backend + Database (Railway):**
- PostgreSQL included
- $5/month starter
- Easy scaling
- Automatic HTTPS

#### Option B: **Full Stack on Railway**

- One platform for everything
- PostgreSQL + Redis included
- $5/month starter

#### Option C: **AWS / GCP / Azure**

- Enterprise scale
- More complex setup
- Pay-as-you-go

---

## Migration Plan

### Phase 1: Fix Hardcoded Paths (Immediate)

1. Move battery catalog to project
2. Use environment variables for paths
3. Support relative paths

```typescript
// Create config system
// src/config/index.ts
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const CATALOG_FILE = path.join(DATA_DIR, 'battery-catalog.csv');
```

### Phase 2: Add Database (Week 1-2)

1. Set up PostgreSQL
2. Create schema
3. Migrate battery catalog
4. Add user projects table

### Phase 3: File Storage (Week 2-3)

1. Set up S3/R2
2. Migrate file uploads
3. Store analysis results

### Phase 4: Full Migration (Optional, Later)

1. Move static content to CMS
2. Admin UI for content management
3. Version control for content

---

## Database Schema (Phase 2)

### Tables

```sql
-- Battery Catalog
CREATE TABLE battery_catalog (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(255),
  manufacturer VARCHAR(255),
  capacity_kwh DECIMAL(10,2),
  power_kw DECIMAL(10,2),
  efficiency DECIMAL(5,4),
  warranty_years INTEGER,
  price_1_10 DECIMAL(10,2),
  price_11_20 DECIMAL(10,2),
  price_21_50 DECIMAL(10,2),
  price_50_plus DECIMAL(10,2),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name VARCHAR(255),
  description TEXT,
  status VARCHAR(50), -- 'draft', 'analyzing', 'complete'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Analysis Results
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  battery_id INTEGER REFERENCES battery_catalog(id),
  peak_reduction_kw DECIMAL(10,2),
  annual_savings DECIMAL(10,2),
  payback_years DECIMAL(5,2),
  roi_percent DECIMAL(5,2),
  result_data JSONB, -- Full simulation results
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Uploads
CREATE TABLE user_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  file_name VARCHAR(255),
  file_type VARCHAR(50), -- 'interval_data', 'monthly_bills'
  storage_url TEXT, -- S3/R2 URL
  file_size BIGINT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Generated Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  report_type VARCHAR(50), -- 'energy_model', 'savings', 'proposal'
  storage_url TEXT, -- PDF/Excel URL
  generated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Environment Configuration

### Create `.env.example`

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/everwatt

# File Storage
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=everwatt-uploads
AWS_REGION=us-east-1

# OR Cloudflare R2
R2_ACCOUNT_ID=your_account
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=everwatt-uploads

# Application
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://everwatt-engine.vercel.app

# Data Paths (Development)
DATA_DIR=./data
CATALOG_FILE=./data/battery-catalog.csv
```

---

## Quick Start: Deploy to Production

### Step 1: Prepare Code

```bash
# Move battery catalog into project
mkdir -p data
cp "C:\Users\nikjo\OneDrive\Desktop\EverWatt_Engine\TRAINING_DATA\BATTERY_CATALOG\BATTERY_CATALOG.csv" ./data/battery-catalog.csv

# Create .env file
cp .env.example .env
# Edit .env with your values
```

### Step 2: Set Up Database (Railway Example)

1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL database
4. Copy DATABASE_URL to .env

### Step 3: Set Up File Storage (Cloudflare R2 Example)

1. Go to Cloudflare Dashboard
2. Create R2 bucket
3. Create API token
4. Add credentials to .env

### Step 4: Deploy Backend

```bash
# Install database client
npm install pg @types/pg

# Run migrations
npm run migrate

# Deploy to Railway
railway up
```

### Step 5: Deploy Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

---

## Next Steps

1. **Create `src/config/index.ts`** - Centralized configuration
2. **Create database migrations** - Set up schema
3. **Create data access layer** - Abstract database calls
4. **Update API endpoints** - Use database instead of files
5. **Add file upload to S3/R2** - Store user files
6. **Set up CI/CD** - Automatic deployments

Would you like me to start implementing any of these steps?

