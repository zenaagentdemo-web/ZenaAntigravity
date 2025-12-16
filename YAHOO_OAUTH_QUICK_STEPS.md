# Yahoo OAuth Quick Steps

## Current Status
✅ Yahoo OAuth credentials configured in `.env`
✅ ngrok running with HTTPS URL
✅ JWT token expiration increased to 24 hours
✅ Logout button added to Settings page
✅ All code implementation complete

## Next Steps to Test Yahoo OAuth

### 1. Start Backend Server
```bash
cd /Users/hamishmcgee/Desktop/ZenaKiro/packages/backend
npm run dev
```

Wait until you see: **"Server running on port 3000"**

### 2. Verify ngrok is Running
In another terminal:
```bash
ngrok http 3000
```

Make sure the HTTPS URL matches what's in your `.env` file:
```
https://tarnishable-elenor-unmedicinal.ngrok-free.dev
```

### 3. Log In Fresh
1. Open browser: http://localhost:5173/login
2. Log in with:
   - Email: `demo@zena.ai`
   - Password: `DemoSecure2024!`

### 4. Test Yahoo OAuth
1. Click the **Settings** icon (gear icon) in the navigation
2. Scroll to "Email Accounts" section
3. Click **"📧 Connect Yahoo Mail"** button
4. Watch the browser console for detailed logs
5. A popup should open with Yahoo's authorization page
6. Log in to your Yahoo account and authorize the app
7. The popup will close and your Yahoo account should be connected

### 5. Verify Connection
- You should see your Yahoo email account listed in the "Connected Email Accounts" section
- Click "Sync Now" to trigger an email sync
- Check the Focus/Waiting pages to see synced emails

## Troubleshooting

### If you get "401 Unauthorized"
- Your JWT token expired
- Log out using the new **"Log Out"** button in Settings
- Log in again fresh

### If the popup is blocked
- Allow popups for localhost:5173 in your browser settings
- Try again

### If ngrok URL changed
- Update `YAHOO_REDIRECT_URI` in `packages/backend/.env`
- Update the redirect URI in your Yahoo app settings
- Restart the backend server

### If backend is not running
- You'll see "ERR_CONNECTION_REFUSED" in console
- Start the backend server (step 1 above)

## What Changed

### 1. Added Logout Button
- Settings page now has a proper "Log Out" button in the top-right
- No more confusing "door icon" behavior
- Clear confirmation dialog before logging out

### 2. JWT Token Expiration
- Increased from 15 minutes to 24 hours
- Prevents frequent logouts during testing
- You can change this in `.env`: `JWT_EXPIRES_IN=24h`

### 3. Console Logging
- Detailed logs in browser console for debugging
- Shows each step of the OAuth flow
- Helps identify where issues occur

## Yahoo OAuth Credentials

**App ID**: ytO270mQ
**Client ID**: dj0yJmk9Tk9JalRWUWJQNmxjJmQ9WVdrOWVYUlBNamN3YlZFbWNHbzlNQT09JnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PTJh
**Client Secret**: 2699c28490a59d70e358779c90f77972a5c990df
**Redirect URI**: https://tarnishable-elenor-unmedicinal.ngrok-free.dev/api/accounts/email/callback

These are already configured in your `.env` file.
