# Deployment Checklist

## Current State Summary

### ✅ What's Working
- **Training Content**: Stored as TypeScript files in `src/data/training/`
- **Knowledge Base**: Stored as TypeScript files in `src/data/knowledge-base/`
- **API Server**: Hono server running on port 3001
- **Frontend**: React app with React Router

### ⚠️ What Needs Fixing
- **Battery Catalog**: Hardcoded absolute path - won't work in production
- **User Data**: No persistence - analysis results are lost
- **File Uploads**: Stored temporarily, not persisted

---

## Quick Fix: Make Battery Catalog Work in Production

### Step 1: Copy Catalog to Project

```bash
# Create data directory
mkdir -p data

# Copy battery catalog (adjust source path)
copy "C:\Users\nikjo\OneDrive\Desktop\EverWatt_Engine\TRAINING_DATA\BATTERY_CATALOG\BATTERY_CATALOG.csv" data\battery-catalog.csv
```

### Step 2: Update .gitignore

Add to `.gitignore`:
```
# Keep data directory, but ignore large files if needed
data/*.csv.bak
```

### Step 3: Test

The server will now use `./data/battery-catalog.csv` (or env variable if set).

---

## Deployment Options

### Option 1: Simple Deployment (No Database) - **Recommended for MVP**

**Perfect for:** Getting online fast, testing with users

**Setup:**
1. Frontend: Deploy to Vercel (free)
2. Backend: Deploy to Railway/Render (free tier)
3. Files: Store in codebase (battery catalog)
4. Uploads: Save to server disk (temporary)

**Limitations:**
- No user accounts
- Analysis results not saved
- Single server instance

**Cost:** $0-5/month

---

### Option 2: Production-Ready (With Database)

**Perfect for:** Real users, data persistence, scaling

**Setup:**
1. Database: PostgreSQL on Railway/Supabase (free tier)
2. File Storage: Cloudflare R2 or AWS S3 ($0-10/month)
3. Backend: Railway/Render ($5-10/month)
4. Frontend: Vercel (free)

**Features:**
- User projects saved
- Analysis history
- File uploads persisted
- Can scale

**Cost:** $5-20/month

---

### Option 3: Enterprise (Full Stack)

**Perfect for:** Large scale, multiple users, admin panel

**Add:**
- User authentication (Auth0, Clerk)
- Admin panel for content management
- CDN for static assets
- Monitoring (Sentry, DataDog)

**Cost:** $50-200/month

---

## Immediate Actions (Before Going Live)

1. ✅ **Fix battery catalog path** - Use relative path + env variable
2. ✅ **Add .env.example** - Document configuration
3. ✅ **Create config system** - Centralized settings
4. ⬜ **Move catalog to project** - Copy CSV to `data/` folder
5. ⬜ **Test in production mode** - `NODE_ENV=production npm run build`
6. ⬜ **Set up environment variables** - On hosting platform
7. ⬜ **Add error handling** - Catch and log errors properly
8. ⬜ **Add rate limiting** - Prevent API abuse

---

## Recommended First Deployment

### Phase 1: MVP (This Week)

```bash
# 1. Copy battery catalog
mkdir -p data
copy "C:\Users\nikjo\OneDrive\Desktop\EverWatt_Engine\TRAINING_DATA\BATTERY_CATALOG\BATTERY_CATALOG.csv" data\battery-catalog.csv

# 2. Deploy frontend to Vercel
npm install -g vercel
vercel

# 3. Deploy backend to Railway
# - Sign up at railway.app
# - Connect GitHub repo
# - Add Node.js service
# - Set PORT=3001
# - Add environment variables
```

### Phase 2: Add Database (Next Week)

- Set up PostgreSQL
- Migrate battery catalog to DB
- Add project saving

### Phase 3: File Storage (Week 3)

- Set up S3/R2
- Move file uploads to cloud
- Add report generation storage

---

## Environment Variables for Production

On your hosting platform, set:

```
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-app.vercel.app
CATALOG_FILE=./data/battery-catalog.csv
```

---

## Next Steps

1. **Read** `DATA_STORAGE_AND_DEPLOYMENT.md` for detailed architecture
2. **Copy** battery catalog to `data/` folder
3. **Test** locally with production mode
4. **Deploy** to Vercel + Railway
5. **Monitor** logs for errors
6. **Iterate** based on user feedback

---

## Questions?

- **Where is data stored?** Currently in TypeScript files + CSV. Moving to database.
- **How to update content?** Edit TypeScript files and redeploy (or move to CMS later).
- **Can users save projects?** Not yet - coming in Phase 2 with database.
- **What about file uploads?** Currently temporary. Moving to S3/R2 in Phase 3.

