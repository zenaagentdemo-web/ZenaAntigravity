# Quick Start: OAuth Email Integration

## TL;DR

Connect Gmail/Outlook/Yahoo with OAuth instead of app passwords. One-click authorization, no password generation needed!

## 5-Minute Setup

### 1. Get Google OAuth Credentials (2 minutes)

1. Go to https://console.cloud.google.com/
2. Create new project: "Zena"
3. Enable Gmail API
4. Create OAuth credentials:
   - Type: Web application
   - Redirect URI: `http://localhost:3000/api/accounts/email/callback`
5. Copy Client ID and Secret

### 2. Update .env (1 minute)

```bash
# Add to packages/backend/.env

# Gmail OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/accounts/email/callback

# Yahoo OAuth (optional)
YAHOO_CLIENT_ID=your-yahoo-client-id
YAHOO_CLIENT_SECRET=your-yahoo-client-secret
YAHOO_REDIRECT_URI=http://localhost:3000/api/accounts/email/callback
```

### 3. Restart Backend (30 seconds)

```bash
cd packages/backend
npm run dev
```

### 4. Test Connection (1 minute)

1. Login to Zena
2. Go to Settings (or use API directly)
3. Click "Connect Gmail"
4. Authorize in popup
5. Done! Emails will sync automatically

## What You Get

✅ **Full Email Messages**: Not just summaries - complete email threads with all messages
✅ **One-Click Connection**: No app passwords, no complex setup
✅ **Automatic Sync**: Emails sync every 5 minutes
✅ **View Full Threads**: Click "View Full Email Thread" on any thread
✅ **HTML & Plain Text**: Both formats supported
✅ **Secure**: OAuth tokens, encrypted storage, limited scopes

## Quick Test

```bash
# Terminal 1: Backend
cd packages/backend
npm run dev

# Terminal 2: Frontend  
cd packages/frontend
npm run dev

# Browser
# 1. Login: demo@zena.ai / DemoSecure2024!
# 2. Settings > Connect Gmail
# 3. Authorize
# 4. Wait for sync or trigger manually
# 5. View thread > "View Full Email Thread"
```

## API Quick Reference

```typescript
// Connect Gmail/Outlook/Yahoo
POST /api/accounts/email/connect
{ "provider": "gmail" | "microsoft" | "yahoo" }

// Complete OAuth
POST /api/accounts/email/callback
{ "code": "...", "state": "..." }

// List accounts
GET /api/accounts/email

// Trigger sync
POST /api/accounts/email/:id/sync
```

## Frontend Integration

```typescript
// Add to Settings page
import { EmailAccountsSection } from './EmailAccountsSection';

<EmailAccountsSection />
```

## Troubleshooting

**Popup blocked?**
- Allow popups for localhost

**redirect_uri_mismatch?**
- Check URI matches exactly: `http://localhost:3000/api/accounts/email/callback`

**No messages showing?**
- Wait 5 minutes for sync
- Or trigger manual sync
- Check backend logs

## Full Documentation

- **Setup Guide**: `OAUTH_EMAIL_SETUP_GUIDE.md`
- **Implementation Details**: `OAUTH_IMPLEMENTATION_SUMMARY.md`
- **Message Storage**: `EMAIL_THREAD_VIEWING_GUIDE.md`

## Why OAuth?

| App Passwords | OAuth 2.0 |
|--------------|-----------|
| ❌ Complex setup | ✅ One-click |
| ❌ Account restrictions | ✅ Works for all |
| ❌ Password exposure | ✅ Secure tokens |
| ❌ Manual generation | ✅ Automatic |

---

**Ready in 5 minutes!** 🚀
