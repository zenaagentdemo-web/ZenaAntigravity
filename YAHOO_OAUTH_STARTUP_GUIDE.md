# Yahoo OAuth Complete Startup Guide

Follow these steps in order. Each step must complete successfully before moving to the next.

---

## STEP 1: Start Backend Server

**Open Terminal 1** and run:

```bash
cd /Users/hamishmcgee/Desktop/ZenaKiro/packages/backend
npm run dev
```

**Wait for this message:**
```
Server started
```

**✅ Success looks like:**
- You see: `{"timestamp":"...","level":"info","message":"Server started","context":{"port":"3000"...}}`
- No errors about database connection
- Server stays running (doesn't crash)

**❌ If you see errors:**
- Database connection error → Make sure PostgreSQL is running: `brew services start postgresql@15`
- Port already in use → Kill the process: `lsof -ti:3000 | xargs kill -9`

**Leave this terminal running!** Do not close it.

---

## STEP 2: Start ngrok Tunnel

**Open Terminal 2** (new terminal window/tab) and run:

```bash
ngrok http 3000
```

**✅ Success looks like:**
You'll see a screen with:
```
Session Status                online
Forwarding                    https://something-random.ngrok-free.dev -> http://localhost:3000
```

**Copy the HTTPS URL** (it will look like: `https://something-random.ngrok-free.dev`)

**Important Notes:**
- The URL changes every time you restart ngrok
- Keep this terminal running
- If the URL is different from `https://tarnishable-elenor-unmedicinal.ngrok-free.dev`, you need to update your `.env` file

---

## STEP 3: Update .env File (if ngrok URL changed)

**Only do this if your ngrok URL is different!**

1. Open `packages/backend/.env`
2. Find the line: `YAHOO_REDIRECT_URI=https://tarnishable-elenor-unmedicinal.ngrok-free.dev/api/accounts/email/callback`
3. Replace with your new ngrok URL: `YAHOO_REDIRECT_URI=https://YOUR-NEW-URL.ngrok-free.dev/api/accounts/email/callback`
4. Save the file
5. **Restart the backend server** (go to Terminal 1, press Ctrl+C, then run `npm run dev` again)

**Also update Yahoo Developer Console:**
1. Go to: https://developer.yahoo.com/apps/
2. Click on your app (ytO270mQ)
3. Update the Redirect URI to match your new ngrok URL
4. Save changes

---

## STEP 4: Verify Backend is Accessible via ngrok

**Open Terminal 3** (new terminal window/tab) and run:

```bash
curl https://YOUR-NGROK-URL.ngrok-free.dev/api/health
```

Replace `YOUR-NGROK-URL` with your actual ngrok URL.

**✅ Success looks like:**
```json
{"status":"ok","timestamp":"..."}
```

**❌ If you see:**
- "ERR_NGROK_3200" → Backend server is not running or ngrok is not connected
- "Connection refused" → Backend server crashed, check Terminal 1
- No response → Wrong URL, check your ngrok terminal for the correct URL

---

## STEP 5: Start Frontend

**Open Terminal 4** (new terminal window/tab) and run:

```bash
cd /Users/hamishmcgee/Desktop/ZenaKiro/packages/frontend
npm run dev
```

**✅ Success looks like:**
```
VITE v4.4.5  ready in XXX ms

➜  Local:   http://localhost:5173/
```

**Leave this terminal running!**

---

## STEP 6: Log In to Zena

1. Open your browser to: **http://localhost:5173/login**
2. Log in with:
   - Email: `demo@zena.ai`
   - Password: `DemoSecure2024!`

**✅ Success looks like:**
- You're redirected to the home page
- You see "Welcome" or the Zena dashboard

**❌ If login fails:**
- Check browser console (F12 → Console tab) for errors
- Make sure backend is running (check Terminal 1)
- Try clearing localStorage: Open console and run `localStorage.clear()`, then refresh

---

## STEP 7: Open Settings Page

1. Click the **Settings** icon (gear icon) in the navigation
2. You should see the Settings page with:
   - A "Log Out" button in the top-right
   - Email Accounts section
   - Connect buttons for Gmail, Outlook, Yahoo

**✅ Success looks like:**
- Settings page loads
- You see the "Connect Yahoo Mail" button

---

## STEP 8: Test Yahoo OAuth

1. **Open browser console** (F12 → Console tab) - keep this open to see logs
2. Click **"📧 Connect Yahoo Mail"** button
3. Watch the console for detailed logs

**✅ Success looks like:**
- Console shows: `[EmailAccountsSection] Starting OAuth for provider: yahoo`
- Console shows: `[EmailAccountsSection] Opening OAuth popup with URL: ...`
- A popup window opens with Yahoo's login page
- You can log in to Yahoo and authorize the app

**❌ If you see errors:**
- "401 Unauthorized" → Your JWT token expired, click "Log Out" and log in again
- "No authorization URL received" → Backend error, check Terminal 1 for errors
- Popup blocked → Allow popups for localhost:5173 in browser settings
- "ERR_NGROK_3200" in popup → ngrok is not connected to backend, check Terminal 2

---

## STEP 9: Complete Yahoo Authorization

1. In the popup, log in to your Yahoo account
2. Click "Agree" to authorize Zena to access your Yahoo Mail
3. The popup should close automatically
4. You should see an alert: "Email account connected successfully!"
5. Your Yahoo account should appear in the "Connected Email Accounts" section

**✅ Success looks like:**
- Popup closes
- Alert shows success message
- Yahoo account appears in the list with your email address

---

## STEP 10: Verify Email Sync

1. Click **"Sync Now"** button next to your Yahoo account
2. Wait a few seconds
3. Click **"Focus"** or **"Waiting"** in the navigation
4. You should see emails from your Yahoo account

**✅ Success looks like:**
- Emails appear in Focus or Waiting pages
- Emails have subjects, participants, and timestamps

---

## Troubleshooting Quick Reference

### Backend won't start
```bash
# Check if PostgreSQL is running
brew services list

# Start PostgreSQL if needed
brew services start postgresql@15

# Check if port 3000 is in use
lsof -ti:3000

# Kill process on port 3000 if needed
lsof -ti:3000 | xargs kill -9
```

### ngrok shows offline
- Make sure backend is running first (Terminal 1)
- Make sure ngrok is pointing to port 3000
- Try restarting ngrok

### Login fails
```javascript
// Clear localStorage in browser console
localStorage.clear()
// Then refresh page and try logging in again
```

### JWT token expired
- Click "Log Out" button in Settings
- Log in again with demo@zena.ai / DemoSecure2024!

### Yahoo OAuth fails
1. Check all 4 terminals are running
2. Verify ngrok URL matches .env file
3. Verify ngrok URL matches Yahoo Developer Console
4. Check browser console for specific error messages

---

## Current Configuration

**Yahoo OAuth Credentials:**
- App ID: `ytO270mQ`
- Client ID: `dj0yJmk9Tk9JalRWUWJQNmxjJmQ9WVdrOWVYUlBNamN3YlZFbWNHbzlNQT09JnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PTJh`
- Client Secret: `2699c28490a59d70e358779c90f77972a5c990df`
- Redirect URI: `https://tarnishable-elenor-unmedicinal.ngrok-free.dev/api/accounts/email/callback`

**Demo Account:**
- Email: `demo@zena.ai`
- Password: `DemoSecure2024!`

**URLs:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- ngrok: https://tarnishable-elenor-unmedicinal.ngrok-free.dev (or your current URL)

---

## Summary of Running Terminals

You should have **4 terminals running**:

1. **Terminal 1**: Backend server (`npm run dev` in packages/backend)
2. **Terminal 2**: ngrok tunnel (`ngrok http 3000`)
3. **Terminal 3**: Can be closed after verification
4. **Terminal 4**: Frontend server (`npm run dev` in packages/frontend)

All 4 must stay running for Yahoo OAuth to work!
