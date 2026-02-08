# Quick Fix - Getting the App Running

## Current Status
The app has some TypeScript errors, but **Vite will still run** in dev mode (it just shows warnings).

## To Start the App

### Option 1: Start Both Servers (Recommended)

**Terminal 1 - Backend:**
```bash
npm run dev:server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Then open: **http://localhost:5173**

### Option 2: Quick Test Without Type Checking

If you get TypeScript errors blocking startup, you can:

1. **Check if servers are actually running:**
   - Look for output like "VITE ready" or "Server running on port 3001"
   - If you see errors, they might just be warnings

2. **Access the app anyway:**
   - TypeScript errors don't prevent Vite from serving the app
   - Open http://localhost:5173 even if you see errors

3. **If the page loads but has errors:**
   - Check browser console (F12)
   - The main app structure should still work
   - Some features might have issues until TypeScript errors are fixed

## Common Issues

### "Cannot find module" errors
- Run: `npm install` to ensure all dependencies are installed

### Port already in use
- Change the port in `vite.config.ts` or `src/server.ts`
- Or kill the process using the port

### Blank page
- Check browser console for JavaScript errors
- Check if both servers are running
- Verify the API proxy is working

## What Should Work
Even with TypeScript errors, these should work:
- ✅ Dashboard page
- ✅ Equipment Library page
- ✅ Measures Library page
- ✅ Navigation sidebar
- ✅ Basic UI components

## What Might Have Issues
- ⚠️ Battery calculations (some type mismatches)
- ⚠️ API endpoints (may have some type issues)
- ⚠️ Advanced features

The app should still be usable for browsing the knowledge base and viewing pages!

