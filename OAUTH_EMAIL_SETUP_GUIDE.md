# OAuth Email Setup Guide

## Overview

Zena uses **OAuth 2.0** for frictionless email account connections - no app passwords needed! Users simply click "Connect Gmail" or "Connect Outlook" and authorize access through the familiar OAuth flow.

## Why OAuth Instead of App Passwords?

✅ **Better User Experience**: One-click authorization, no password generation
✅ **More Secure**: Tokens can be revoked, limited scope, no password exposure
✅ **Works for Everyone**: No account age restrictions or feature limitations
✅ **Industry Standard**: Used by all major email providers

## Supported Providers

- **Gmail** (Google OAuth)
- **Outlook/Microsoft 365** (Microsoft OAuth)
- **Yahoo Mail** (Yahoo OAuth)

## Setup Instructions

### 1. Gmail OAuth Setup

#### Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

#### Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in application information:
   - App name: "Zena AI"
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Add test users (for development):
   - Add your Gmail address
   - Add any other test accounts

#### Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Application type: "Web application"
4. Name: "Zena Backend"
5. Authorized redirect URIs:
   - Development: `http://localhost:3000/api/accounts/email/callback`
   - Production: `https://your-domain.com/api/accounts/email/callback`
6. Click "Create"
7. **Save the Client ID and Client Secret**

#### Update .env File

```bash
# Gmail OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/accounts/email/callback
```

### 2. Microsoft OAuth Setup

#### Register Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Fill in details:
   - Name: "Zena AI"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: 
     - Platform: Web
     - URI: `http://localhost:3000/api/accounts/email/callback`
5. Click "Register"

#### Configure API Permissions

1. Go to "API permissions"
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Choose "Delegated permissions"
5. Add these permissions:
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `User.Read`
   - `offline_access`
6. Click "Add permissions"
7. Click "Grant admin consent" (if you're admin)

#### Create Client Secret

1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Description: "Zena Backend"
4. Expires: Choose duration (24 months recommended)
5. Click "Add"
6. **Copy the secret value immediately** (you won't see it again)

#### Update .env File

```bash
# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-application-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/accounts/email/callback
```

## Frontend Integration

### Connect Email Account Flow

1. **User clicks "Connect Gmail" button**
2. **Frontend calls**: `POST /api/accounts/email/connect`
   ```json
   {
     "provider": "gmail"
   }
   ```
3. **Backend responds** with authorization URL:
   ```json
   {
     "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
     "state": "base64-encoded-state"
   }
   ```
4. **Frontend redirects** user to authorization URL
5. **User authorizes** in Gmail/Outlook
6. **Provider redirects** back to your app with code
7. **Frontend calls**: `POST /api/accounts/email/callback`
   ```json
   {
     "code": "authorization-code",
     "state": "base64-encoded-state"
   }
   ```
8. **Backend exchanges** code for tokens and creates account
9. **Sync starts automatically**

### Example Frontend Code

```typescript
// Connect Gmail
async function connectGmail() {
  try {
    // Step 1: Get authorization URL
    const response = await api.post('/api/accounts/email/connect', {
      provider: 'gmail'
    });
    
    const { authorizationUrl, state } = response.data;
    
    // Step 2: Open OAuth popup or redirect
    const popup = window.open(
      authorizationUrl,
      'oauth',
      'width=600,height=700'
    );
    
    // Step 3: Listen for callback
    window.addEventListener('message', async (event) => {
      if (event.data.type === 'oauth-callback') {
        const { code, state: returnedState } = event.data;
        
        // Step 4: Complete OAuth flow
        await api.post('/api/accounts/email/callback', {
          code,
          state: returnedState
        });
        
        // Step 5: Refresh account list
        loadEmailAccounts();
        
        popup?.close();
      }
    });
  } catch (error) {
    console.error('Failed to connect Gmail:', error);
    alert('Failed to connect Gmail account');
  }
}
```

### OAuth Callback Page

Create a simple callback page that posts message to opener:

```html
<!-- public/oauth-callback.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Connecting...</title>
</head>
<body>
  <p>Connecting your account...</p>
  <script>
    // Extract code and state from URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    
    // Send to opener window
    if (window.opener) {
      window.opener.postMessage({
        type: 'oauth-callback',
        code,
        state,
        error
      }, window.location.origin);
    }
  </script>
</body>
</html>
```

## API Endpoints

### Connect Email Account
```
POST /api/accounts/email/connect
Authorization: Bearer <token>

Request:
{
  "provider": "gmail" | "microsoft" | "yahoo"
}

Response:
{
  "authorizationUrl": "https://...",
  "state": "base64-state"
}
```

### OAuth Callback
```
POST /api/accounts/email/callback
Authorization: Bearer <token>

Request:
{
  "code": "authorization-code",
  "state": "base64-state"
}

Response:
{
  "success": true,
  "account": {
    "id": "uuid",
    "provider": "gmail",
    "email": "user@gmail.com",
    "syncEnabled": true,
    "createdAt": "2024-12-09T..."
  }
}
```

### List Email Accounts
```
GET /api/accounts/email
Authorization: Bearer <token>

Response:
{
  "accounts": [
    {
      "id": "uuid",
      "provider": "gmail",
      "email": "user@gmail.com",
      "syncEnabled": true,
      "lastSyncAt": "2024-12-09T...",
      "createdAt": "2024-12-09T..."
    }
  ]
}
```

### Disconnect Account
```
DELETE /api/accounts/email/:id
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Email account disconnected"
}
```

### Trigger Manual Sync
```
POST /api/accounts/email/:id/sync
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Sync triggered",
  "accountId": "uuid"
}
```

## Security Considerations

### State Parameter
- Contains userId, provider, and timestamp
- Base64 encoded for transport
- Validated on callback to prevent CSRF
- Expires after 10 minutes

### Token Storage
- Access tokens and refresh tokens are encrypted in database
- Tokens are automatically refreshed when expired
- Tokens can be revoked by user at any time

### Scopes
- Request minimum necessary scopes
- Gmail: read, send, modify (no delete)
- Microsoft: read, write, send (no admin)

## Testing

### Test OAuth Flow

1. **Start backend**:
   ```bash
   cd packages/backend
   npm run dev
   ```

2. **Login to Zena** with demo account

3. **Connect Gmail**:
   - Click "Connect Gmail" button
   - Authorize in popup
   - Verify account appears in list

4. **Check sync**:
   - Wait 5 minutes for automatic sync
   - Or trigger manual sync
   - Check logs for sync activity

5. **View messages**:
   - Navigate to Focus/Waiting page
   - Click on a thread
   - Click "View Full Email Thread"
   - Verify messages display

### Troubleshooting

**"redirect_uri_mismatch" error**:
- Verify redirect URI in Google/Azure matches exactly
- Include protocol (http/https)
- Include port for localhost
- No trailing slash

**"invalid_client" error**:
- Check client ID and secret are correct
- Verify they're in .env file
- Restart backend after changing .env

**"insufficient_scope" error**:
- Verify all required scopes are added
- Re-authorize the application
- Check OAuth consent screen configuration

**No messages syncing**:
- Check backend logs for sync errors
- Verify Gmail API is enabled
- Check token hasn't expired
- Try manual sync

## Production Deployment

### Google OAuth

1. **Verify domain ownership** in Google Cloud Console
2. **Update OAuth consent screen** to "Production"
3. **Add production redirect URI**
4. **Update environment variables** with production values

### Microsoft OAuth

1. **Add production redirect URI** in Azure
2. **Update environment variables**
3. **Consider multi-tenant** if supporting organizations

### Environment Variables

```bash
# Production .env
GOOGLE_CLIENT_ID=prod-client-id
GOOGLE_CLIENT_SECRET=prod-secret
GOOGLE_REDIRECT_URI=https://api.zena.ai/api/accounts/email/callback

MICROSOFT_CLIENT_ID=prod-app-id
MICROSOFT_CLIENT_SECRET=prod-secret
MICROSOFT_REDIRECT_URI=https://api.zena.ai/api/accounts/email/callback
```

### 3. Yahoo OAuth Setup

#### Create Yahoo Developer App

1. Go to [Yahoo Developer Console](https://developer.yahoo.com/apps/)
2. Sign in with your Yahoo account
3. Click "Create an App"
4. Fill in details:
   - **Application Name**: "Zena AI"
   - **Application Type**: "Web Application"
   - **Description**: "Real estate email assistant"
   - **Home Page URL**: `http://localhost:5173`
   - **Redirect URI(s)**: `http://localhost:3000/api/accounts/email/callback`
5. Click "Create App"

#### Get Credentials

1. After creating the app, you'll see:
   - **Client ID** (App ID)
   - **Client Secret**
2. Copy both values

#### Configure API Permissions

Make sure your app has these permissions:
- `openid` - User authentication
- `mail-r` - Read mail
- `mail-w` - Write/send mail (optional)

#### Update .env File

```bash
# Yahoo OAuth
YAHOO_CLIENT_ID=your-yahoo-client-id
YAHOO_CLIENT_SECRET=your-yahoo-client-secret
YAHOO_REDIRECT_URI=http://localhost:3000/api/accounts/email/callback
```

## Future Enhancements

- **iCloud OAuth**: Support Apple Mail
- **Multiple Accounts**: Allow connecting multiple Gmail accounts
- **Selective Sync**: Let users choose which folders to sync
- **Real-time Sync**: Use webhooks/push notifications instead of polling

---

**Note**: OAuth setup requires one-time configuration but provides the best user experience. Users can connect their email in seconds without generating app passwords or exposing credentials.
