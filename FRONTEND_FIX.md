# Frontend React Hooks Error Fix

## Problem
The frontend occasionally shows a blank page with React hooks errors:
- "Invalid hook call. Hooks can only be called inside of the body of a function component"
- "Cannot read properties of null (reading 'useState')"

## Root Cause
**Dual corruption issue:**
1. Corrupted Vite cache and inconsistent node_modules causing React version conflicts
2. Corrupted browser storage (localStorage, sessionStorage, IndexedDB)

## Complete Solution

### 1. Server-Side Fix (Vite Cache)
```bash
cd packages/frontend
rm -rf .vite node_modules
npm install
npm run dev
```

### 2. Browser-Side Fix (Site Data)
**In Chrome/Edge:**
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Storage" in left sidebar
4. Click "Clear site data" button
5. Refresh page

**Alternative:** Hard refresh with `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

### 3. Prevention Strategy

#### A. Clean Startup Script
Always use `scripts/clean-start.sh` when starting from scratch:
```bash
./scripts/clean-start.sh
```

#### B. When Issue Occurs
1. **First**: Clear browser site data (Application → Storage → Clear site data)
2. **If still broken**: Clear Vite cache and restart frontend
3. **Nuclear option**: Do both + hard refresh

### 4. Why This Happens
- **Vite cache corruption**: Hot module replacement state gets corrupted
- **Browser storage corruption**: React state persisted in localStorage conflicts with new code
- **Version mismatches**: Multiple React instances loaded simultaneously

## Quick Fix Checklist
When you see blank page:
- [ ] Clear browser site data (Application → Storage → Clear site data)
- [ ] Hard refresh (Cmd+Shift+R)
- [ ] If still broken: `rm -rf .vite node_modules && npm install && npm run dev`

## Status
✅ Root cause identified (dual corruption)
✅ Complete fix documented
✅ Prevention script created
✅ Gmail OAuth ready for testing