# Yahoo Mail Setup Guide for Zena

This guide will help you connect your Yahoo Mail account to Zena using OAuth 2.0 (recommended) or IMAP with app passwords.

## Option 1: OAuth 2.0 (Recommended - No App Password Needed!)

OAuth 2.0 is the easiest and most secure way to connect your Yahoo Mail. Users simply click a button and authorize access - no app passwords required!

### Step 1: Set Up ngrok (Required for HTTPS)

**Why ngrok?** Yahoo requires HTTPS for OAuth redirect URIs. ngrok creates a secure HTTPS tunnel to your local development server.

1. **Install ngrok**
   ```bash
   brew install ngrok
   ```

2. **Start ngrok tunnel** (in a new terminal window)
   ```bash
   ngrok http 3000
   ```

3. **Copy the HTTPS URL**
   - You'll see output like: `Forwarding   https://abc123def456.ngrok.io -> http://localhost:3000`
   - Copy the HTTPS URL (e.g., `https://abc123def456.ngrok.io`)
   - **Keep this terminal window open** - ngrok must stay running!

4. **Update your .env file**
   ```bash
   cd /Users/hamishmcgee/Desktop/ZenaAntigravity/packages/backend
   open .env
   ```
   
   Find this line:
   ```env
   YAHOO_REDIRECT_URI=YOUR_NGROK_URL/api/accounts/email/callback
   ```
   
   Replace `YOUR_NGROK_URL` with your actual ngrok URL:
   ```env
   YAHOO_REDIRECT_URI=https://abc123def456.ngrok.io/api/accounts/email/callback
   ```

5. **Restart your backend server**
   - Stop the backend (Ctrl+C in the terminal running `npm run dev`)
   - Start it again: `npm run dev`

### Step 2: Create a Yahoo Developer App

1. **Go to Yahoo Developer Console**
   - Visit: https://developer.yahoo.com/apps/
   - Sign in with your Yahoo account

2. **Create a New App**
   - Click "Create an App"
   - Fill in the details:
     - **Application Name**: `Zena` (or your preferred name)
     - **Application Type**: Select "Web Application"
     - **Description**: `Real estate email assistant`
     - **Home Page URL**: `http://localhost:5173` (for development)
     - **Redirect URI(s)**: Use your ngrok URL: `https://abc123def456.ngrok.io/api/accounts/email/callback`
       (Replace with your actual ngrok URL from Step 1)
   - Click "Create App"

3. **Get Your Credentials**
   - After creating the app, you'll see:
     - **Client ID** (also called App ID)
     - **Client Secret**
   - Copy both values - you'll need them in the next step

4. **Configure API Permissions**
   - Make sure your app has these permissions:
     - `openid` - For user authentication
     - `mail-r` - Read mail
     - `mail-w` - Write/send mail (optional)

### Step 3: Add Credentials to .env File

1. **Open the .env file** (if not already open)
   ```bash
   cd /Users/hamishmcgee/Desktop/ZenaAntigravity/packages/backend
   open .env
   ```

2. **Find the Yahoo OAuth section** and update it with your credentials:
   ```env
   # OAuth - Yahoo Mail
   YAHOO_CLIENT_ID=paste-your-client-id-here
   YAHOO_CLIENT_SECRET=paste-your-client-secret-here
   YAHOO_REDIRECT_URI=https://abc123def456.ngrok.io/api/accounts/email/callback
   ```
   
   **Important**: Make sure the `YAHOO_REDIRECT_URI` matches exactly what you entered in the Yahoo Developer Console!

3. **Save the file**

4. **Restart your backend server** (if not already restarted)
   - Stop the backend (Ctrl+C)
   - Start it again: `npm run dev`

### Step 4: Connect Yahoo Mail in Zena

1. **Start the backend server** (if not already running):
   ```bash
   cd /Users/hamishmcgee/Desktop/ZenaAntigravity/packages/backend
   npm run dev
   ```

2. **Start the frontend** (in a new terminal):
   ```bash
   cd /Users/hamishmcgee/Desktop/ZenaAntigravity/packages/frontend
   npm run dev
   ```

3. **Open Zena in your browser**:
   - Go to: http://localhost:5173
   - Login with: `demo@zena.ai` / `DemoSecure2024!`

4. **Connect Yahoo Mail**:
   - Click "Settings" in the bottom navigation
   - Scroll to "Email Accounts" section
   - Click "📧 Connect Yahoo Mail"
   - A popup will open with Yahoo's login page
   - Sign in with your Yahoo account
   - Click "Agree" to authorize Zena
   - The popup will close and your account will be connected!

5. **Emails will sync automatically every 1 minute**

---

## Option 2: IMAP with App Password (Fallback)

If OAuth doesn't work for your account, you can use IMAP with an app password.

### Step 1: Generate Yahoo App Password

**Note**: Some Yahoo accounts may not have access to app passwords. If the button is greyed out, use OAuth instead.

1. **Go to Yahoo Account Security**
   - Visit: https://login.yahoo.com/account/security
   - Sign in with your Yahoo account

2. **Enable 2-Step Verification** (if not already enabled)
   - This is required for app passwords

3. **Generate App Password**
   - Scroll down to "Generate app password" or "Manage app passwords"
   - Click "Generate app password"
   - Select "Other App" from the dropdown
   - Name it: `Zena`
   - Click "Generate"

4. **Copy the Password**
   - You'll see a 16-character password like: `abcd efgh ijkl mnop`
   - Copy this password (remove spaces)

### Step 2: Add IMAP Credentials to .env File

1. **Open the .env file**
   ```bash
   cd /Users/hamishmcgee/Desktop/ZenaAntigravity/packages/backend
   open .env
   ```

2. **Find the Yahoo IMAP section** and update it:
   ```env
   # Yahoo IMAP (fallback for direct IMAP connection)
   YAHOO_EMAIL=your-actual-email@yahoo.com
   YAHOO_APP_PASSWORD=abcdefghijklmnop
   YAHOO_IMAP_HOST=imap.mail.yahoo.com
   YAHOO_IMAP_PORT=993
   ```

3. **Save the file**

### Step 3: Test the Connection

```bash
cd /Users/hamishmcgee/Desktop/ZenaAntigravity/packages/backend
npm run test:yahoo
```

### Step 4: Add Account to Database

```bash
npm run add:yahoo
```

---

## Troubleshooting

### OAuth Issues

**"Invalid redirect URI" error**
- Make sure the redirect URI in your Yahoo app matches exactly what's in your `.env` file
- Both must use your ngrok HTTPS URL (e.g., `https://abc123def456.ngrok.io/api/accounts/email/callback`)
- If your ngrok URL changed (ngrok generates new URLs on restart), update both the Yahoo app and `.env` file

**ngrok URL changed**
- Free ngrok URLs change every time you restart ngrok
- If you restart ngrok, you'll need to:
  1. Copy the new HTTPS URL
  2. Update `YAHOO_REDIRECT_URI` in `.env`
  3. Update the Redirect URI in your Yahoo Developer app
  4. Restart your backend server

**"App not verified" warning**
- This is normal for development apps. Click "Continue" to proceed.

**Popup blocked**
- Allow popups for localhost in your browser settings

### IMAP Issues

**"App password button is greyed out"**
- Your account may not support app passwords. Use OAuth instead.

**"Authentication failed"**
- Double-check your email and app password
- Make sure you're using the app password, not your regular password
- Ensure IMAP is enabled in Yahoo settings

### No Emails Syncing

1. Check the backend server logs for errors
2. Verify the email account is connected in Settings
3. Try clicking "Sync Now" on the account
4. Check that `syncEnabled` is true in the database

---

## Next Steps

Once your Yahoo account is connected:

1. **Send test emails** to your Yahoo account
2. **Wait for sync** (every 1 minute) or click "Sync Now"
3. **Check Focus/Waiting lists** for your emails
4. **Test AI classification** and draft responses

## Need Help?

If you encounter issues:
1. Check backend logs: Look at the terminal where `npm run dev` is running
2. Check database: Run `npm run db:studio` to view the database
3. Test OAuth: Try disconnecting and reconnecting the account
