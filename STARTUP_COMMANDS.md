# Zena Development Server Startup Commands

You need to run these three commands in **separate terminal windows/tabs**:

## Terminal 1: Backend Server
```bash
cd /Users/hamishmcgee/Desktop/ZenaAntigravity/packages/backend
npm run dev
```

**Expected output:**
- Server starts on port 3001
- Database connection established
- "Server running on port 3001" message

## Terminal 2: Frontend Server  
```bash
cd /Users/hamishmcgee/Desktop/ZenaAntigravity/packages/frontend
npm run dev
```

**Expected output:**
- Vite dev server starts
- Frontend available at http://localhost:5173
- Hot reload enabled

## Terminal 3: Ngrok Tunnel
```bash
ngrok http 3001
```

**Expected output:**
- Ngrok tunnel created
- Public URL displayed (should be: https://tarnishable-elenor-unmedicinal.ngrok-free.dev)
- This URL is already configured in your Yahoo app

## Quick Verification

After all three are running:

1. **Backend**: Visit http://localhost:3001/health (should return status OK)
2. **Frontend**: Visit http://localhost:5173 (should show login page)  
3. **Ngrok**: Visit your ngrok URL (should proxy to backend)

## Login Credentials

- **Email**: demo@zena.ai
- **Password**: DemoSecure2024!

## Testing Yahoo OAuth

1. Login to frontend
2. Go to Settings page
3. Click Yahoo email icon
4. Should redirect to Yahoo login (no scope error)
5. After Yahoo login, redirects back to Settings with success message

## Notes

- Backend uses `tsx watch` so it auto-reloads on file changes
- Frontend uses Vite HMR for instant updates
- Ngrok tunnel URL is stable and matches your Yahoo app configuration
- All three must be running for Yahoo OAuth to work properly