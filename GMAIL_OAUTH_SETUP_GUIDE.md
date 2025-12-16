# Gmail OAuth Setup Guide

This guide will help you set up Gmail OAuth integration for Zena so you can sync your Gmail emails.

## Prerequisites

- Google account with Gmail
- Access to Google Cloud Console
- Zena backend running on port 3000
- ngrok tunnel (for OAuth callback)

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `Zena Email Integration`
4. Click "Create"

## Step 2: Enable Gmail API

1. In your Google Cloud project, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click on "Gmail API" and click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" (unless you have a Google Workspace account)
3. Fill in the required fields:
   - **App name**: `Zena AI Assistant`
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click "Save and Continue"
5. On "Scopes" page, click "Add or Remove Scopes"
6. Add these scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/userinfo.email`
7. Click "Save and Continue"
8. On "Test users" page, add your Gmail address as a test user
9. Click "Save and Continue"

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Enter name: `Zena Backend`
5. Add Authorized redirect URIs:
   - `http://localhost:3000/api/accounts/email/callback` (for local development)
   - `https://your-ngrok-url.ngrok-free.dev/api/accounts/email/callback` (for testing)
6. Click "Create"
7. Copy the **Client ID** and **Client Secret**

## Step 5: Update Environment Variables

Update your `packages/backend/.env` file:

```env
# OAuth - Gmail
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/accounts/email/callback
```

## Step 6: Start ngrok Tunnel (for testing)

If you want to test the OAuth flow:

```bash
# Install ngrok if you haven't already
brew install ngrok

# Start tunnel
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.dev`) and update your Google OAuth credentials:

1. Go back to Google Cloud Console → "Credentials"
2. Edit your OAuth 2.0 Client ID
3. Add the ngrok URL to "Authorized redirect URIs":
   - `https://your-ngrok-url.ngrok-free.dev/api/accounts/email/callback`

## Step 7: Test Gmail Integration

1. Make sure your backend is running:
   ```bash
   cd packages/backend
   npm run dev
   ```

2. Make sure your frontend is running:
   ```bash
   cd packages/frontend
   npm run dev
   ```

3. Login to Zena at `http://localhost:5173`

4. Go to Settings page

5. Click the Gmail icon to connect your Gmail account

6. You should be redirected to Google's OAuth consent screen

7. Grant permissions and you'll be redirected back to Zena

8. Your Gmail account should now be connected and syncing automatically

## Step 8: Verify Email Sync

1. Check the Settings page - your Gmail account should be listed
2. Go to the Focus or Waiting pages
3. You should see your Gmail emails appearing
4. The "Last Sync" time should be recent (not 1970)

## Troubleshooting

### "OAuth error: invalid_client"
- Double-check your Client ID and Client Secret in `.env`
- Make sure the redirect URI matches exactly

### "OAuth error: redirect_uri_mismatch"
- Verify the redirect URI in Google Cloud Console matches your backend URL
- For ngrok, make sure you're using the HTTPS URL

### "Access blocked: This app's request is invalid"
- Make sure you've added your email as a test user in OAuth consent screen
- Verify all required scopes are added

### No emails syncing
- Check backend logs for sync errors
- Verify Gmail API is enabled in Google Cloud Console
- Make sure your Gmail account has emails in inbox/sent folders

## Production Setup

For production deployment:

1. Update OAuth consent screen to "In production" status
2. Add your production domain to authorized redirect URIs
3. Update environment variables with production values
4. Consider using Google Workspace for internal apps

## Security Notes

- Keep your Client Secret secure and never commit it to version control
- Use environment variables for all sensitive configuration
- Consider implementing token refresh logic for long-running applications
- Review and minimize OAuth scopes to only what's needed

## Next Steps

Once Gmail is working, you can:
- Add more Gmail accounts
- Set up Microsoft Outlook integration
- Configure email classification rules
- Set up automated responses

## Support

If you encounter issues:
1. Check the backend logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test the OAuth flow step by step
4. Check Google Cloud Console for API quotas and errors