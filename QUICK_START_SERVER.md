# Quick Start - Development Server

## Starting the Server

The development server should be running. If you see "This site can't be reached", try:

### Option 1: Start via Terminal
```powershell
cd c:\everwatt-engine
npm run dev
```

### Option 2: Start Server Separately (if needed)
```powershell
# Terminal 1: Frontend
cd c:\everwatt-engine
npm run dev

# Terminal 2: Backend API (optional)
cd c:\everwatt-engine
npm run server
```

## Access the App

Once running, open:
- **Frontend**: http://localhost:5173
- **API Server**: http://localhost:3001 (if running separately)

## Verify Data Access

The data service will automatically load from:
- `public/data/structured-training-content.json`
- `public/data/extracted-measures.json`
- `public/data/measure-training-links.json`

All data files should be accessible at `/data/*.json` when the server is running.

## Troubleshooting

### Port Already in Use
If port 5173 is busy:
```powershell
# Find and kill process
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process
```

### Data Files Not Found
Ensure files are in `public/data/`:
```powershell
Test-Path "c:\everwatt-engine\public\data\structured-training-content.json"
```

### Server Won't Start
Check for TypeScript errors:
```powershell
npm run type-check
```

## Testing Data Access

Once the server is running, you can test:

1. **In Browser Console:**
```javascript
fetch('/data/structured-training-content.json')
  .then(r => r.json())
  .then(data => console.log('Data loaded:', data.length, 'items'));
```

2. **Via API:**
```bash
curl http://localhost:3001/api/data/categories
```

3. **In React Component:**
```tsx
import { useSearch } from './hooks/useDataService';

function TestComponent() {
  const { results } = useSearch('battery');
  return <div>{results.length} results</div>;
}
```
