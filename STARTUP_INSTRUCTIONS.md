# Zena Startup Instructions

## 🚀 Quick Start (Recommended)

Use the clean startup script to prevent React hooks errors:

```bash
./scripts/clean-start.sh
```

This will:
- Clean Vite cache to prevent React errors
- Install fresh dependencies
- Start both backend and frontend servers
- Display server URLs and PIDs

## 📧 Gmail OAuth Testing

Once servers are running:

1. **Go to Settings**: http://localhost:5173/settings
2. **Click Gmail icon** to start OAuth flow
3. **Grant permissions** in Google's OAuth screen
4. **Verify connection** - Gmail account should appear
5. **Check email sync** - emails sync automatically

## 🔧 Manual Startup (Alternative)

If you prefer manual control:

```bash
# Terminal 1 - Backend
cd packages/backend
npm run dev

# Terminal 2 - Frontend (clean start)
cd packages/frontend
rm -rf .vite node_modules
npm install
npm run dev
```

## ⚠️ If Frontend Shows Blank Page

This indicates **dual corruption** (Vite cache + browser storage). Fix in order:

### Step 1: Clear Browser Site Data (Try First)
1. Open DevTools (F12) → Application tab
2. Click "Storage" → "Clear site data" 
3. Refresh page

### Step 2: Clear Vite Cache (If Step 1 Fails)
```bash
cd packages/frontend
rm -rf .vite node_modules
npm install
npm run dev
```

### Step 3: Nuclear Option (If Both Fail)
Do both steps above + hard refresh (`Cmd+Shift+R`)

## 📊 Server Status

- **Backend**: http://localhost:3000 (API)
- **Frontend**: http://localhost:5173 (Web App)
- **Database**: PostgreSQL on localhost:5432

## 🎯 Gmail OAuth Configuration

Already configured with your credentials:
GOOGLE_OAUTH_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_OAUTH_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE`
- **Redirect URI**: `http://localhost:3000/api/accounts/email/callback`

## ✅ Ready for Testing

Everything is configured and ready. Use the clean startup script and test Gmail OAuth integration!

