# Gmail Integration Quick Start

Get your Gmail emails syncing with Zena in 10 minutes!

## 🚀 Quick Setup (5 steps)

### 1. Google Cloud Setup (2 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "Zena Email Integration"
3. Enable Gmail API: APIs & Services → Library → Search "Gmail API" → Enable
4. Setup OAuth consent: APIs & Services → OAuth consent screen
   - Choose "External"
   - App name: "Zena AI Assistant"
   - Add your email as test user
   - Add scopes: `gmail.readonly`, `gmail.send`, `gmail.modify`, `userinfo.email`

### 2. Create OAuth Credentials (1 minute)

1. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs
2. Web application, name: "Zena Backend"
3. Authorized redirect URIs: `http://localhost:3000/api/accounts/email/callback`
4. Copy Client ID and Client Secret

### 3. Configure Zena (30 seconds)

Update `packages/backend/.env`:

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/accounts/email/callback
```

### 4. Restart Backend (30 seconds)

```bash
cd packages/backend
npm run dev
```

### 5. Connect Gmail (1 minute)

1. Go to http://localhost:5173/settings
2. Click Gmail icon
3. Grant permissions
4. Done! Your emails will start syncing automatically

## ✅ Verification

- Settings page shows your Gmail account
- Focus/Waiting pages show your emails
- Last sync time is recent (not 1970)

## 🔧 Troubleshooting

**"OAuth error: invalid_client"**
- Double-check Client ID/Secret in .env file

**"redirect_uri_mismatch"**
- Verify redirect URI matches exactly in Google Cloud Console

**No emails syncing**
- Check backend logs for errors
- Verify Gmail API is enabled
- Make sure you have emails in Gmail

## 🎯 What's Next?

Once Gmail is working:
- Your emails automatically sync every minute
- AI classifies emails as Focus/Waiting
- You can add multiple Gmail accounts
- Set up Microsoft Outlook integration

## 📞 Need Help?

1. Check `GMAIL_OAUTH_SETUP_GUIDE.md` for detailed instructions
2. Run test script: `node packages/backend/scripts/test-gmail-integration.ts`
3. Check backend logs for detailed error messages

## 🔒 Security

- Never commit credentials to version control
- Use environment variables for all secrets
- Review OAuth scopes regularly
- Consider Google Workspace for production