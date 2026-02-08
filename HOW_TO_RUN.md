# How to Access the EverWatt Engine App

## Quick Start

The app requires **two servers** running simultaneously:

### 1. Start the API Server (Backend)

Open a terminal and run:

```bash
npm run dev:server
```

This starts the API server on **http://localhost:3001**

You should see:
```
🚀 EverWatt Engine API Server running on http://localhost:3001
📡 Health check: http://localhost:3001/health
📊 Analyze endpoint: POST http://localhost:3001/api/analyze
```

### 2. Start the Frontend (UI)

Open a **second terminal** and run:

```bash
npm run dev
```

This starts the Vite dev server (typically on **http://localhost:5173**)

You should see:
```
  VITE v5.0.8  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## Access the App

Once both servers are running:

### Main Application
**Open your browser and go to:**
```
http://localhost:5173
```

### API Endpoints (Backend)
- Health Check: `http://localhost:3001/health`
- Knowledge Base API: `http://localhost:3001/api/knowledge-base/*`
- Analysis API: `http://localhost:3001/api/analyze`

## Available Pages

Once the app loads, you can navigate to:

- **Dashboard** (`/`) - Main dashboard with project overview
- **New Analysis** - Upload files and get battery recommendations
- **Equipment Library** - Browse equipment database
- **Measures Library** - Browse energy efficiency measures
- **Battery Library** - View battery catalog
- **Rate Library** - Utility rate information
- **Technical Library** - Technical documents
- **Historical Library** - Past projects

## Troubleshooting

### Port Already in Use?

If port 5173 is taken, Vite will automatically use the next available port (5174, 5175, etc.). Check the terminal output for the actual URL.

If port 3001 is taken, you can change it:
1. Edit `src/server.ts`
2. Change the port number on line ~305
3. Or set `PORT` environment variable: `PORT=3002 npm run dev:server`

### API Not Working?

Make sure:
1. ✅ Backend server is running on port 3001
2. ✅ Frontend server is running (Vite)
3. ✅ Check browser console for errors
4. ✅ Verify proxy configuration in `vite.config.ts`

### First Time Setup?

If you haven't installed dependencies yet:

```bash
npm install
```

## Production Build

To build for production:

```bash
npm run build
```

This creates a `dist/` folder with the production build.

