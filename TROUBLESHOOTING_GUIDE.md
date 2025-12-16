# Zena Troubleshooting Guide

## 🚨 Frontend Shows Blank Page (React Hooks Error)

**Symptoms:**
- Blank white page at http://localhost:5173
- Console errors: "Invalid hook call" or "Cannot read properties of null (reading 'useState')"
- React DevTools warnings about multiple React copies

**Root Cause:** Dual corruption of Vite cache and browser storage

**Solution (Try in Order):**

### 1. Clear Browser Site Data (90% Success Rate)
```
Chrome/Edge: DevTools (F12) → Application → Storage → Clear site data
Safari: Develop → Empty Caches
Firefox: DevTools (F12) → Storage → Clear All
```

### 2. Clear Vite Cache (If #1 Fails)
```bash
cd packages/frontend
rm -rf .vite node_modules
npm install
npm run dev
```

### 3. Nuclear Reset (If Both Fail)
```bash
# Stop all processes
pkill -f "npm run dev"

# Clear everything
cd packages/frontend
rm -rf .vite node_modules
npm install

# Clear browser data + hard refresh
# Then restart: npm run dev
```

## 🔧 Other Common Issues

### Backend Won't Start
```bash
cd packages/backend
npm install
npm run dev
```

### Database Connection Issues
```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Start if needed
brew services start postgresql

# Verify connection
psql -d zena -U hamishmcgee
```

### Gmail OAuth Errors

**"invalid_client"**
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Verify credentials match Google Cloud Console

**"redirect_uri_mismatch"**
- Ensure redirect URI is exactly: `http://localhost:3000/api/accounts/email/callback`
- Check Google Cloud Console OAuth settings

**No emails syncing**
- Check backend logs for errors
- Verify Gmail API is enabled in Google Cloud Console
- Ensure you have emails in your Gmail account

## 🚀 Prevention

### Always Use Clean Startup
```bash
./scripts/clean-start.sh
```

### Regular Maintenance
```bash
# Weekly cleanup
cd packages/frontend && rm -rf .vite
cd packages/backend && npm install
```

### Browser Settings
- Disable aggressive caching in DevTools
- Use incognito mode for testing
- Clear site data between major changes

## 📞 Emergency Contacts

If all else fails:
1. Check `FRONTEND_FIX.md` for detailed React hooks fix
2. Check `STARTUP_INSTRUCTIONS.md` for startup procedures
3. Use `scripts/clean-start.sh` for automated cleanup

## ✅ Health Check

Verify everything is working:
- [ ] Backend: http://localhost:3000/health (should return 200)
- [ ] Frontend: http://localhost:5173 (should show login page)
- [ ] Database: Can connect to PostgreSQL
- [ ] Gmail OAuth: Can initiate flow from Settings page