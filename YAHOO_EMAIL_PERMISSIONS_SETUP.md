# Yahoo Email Permissions Setup

## Current Issue
Your Yahoo OAuth app only has "Profile - OpenID Connect Permissions" enabled, but to access emails via IMAP, you need "Email - Read" permissions.

## Steps to Fix

### 1. Go to Yahoo Developer Console
- Visit: https://developer.yahoo.com/apps/
- Sign in with your Yahoo account

### 2. Select Your App
- Find your app: **App ID: `tWsPjqmA`**
- Click on it to open the app settings

### 3. Enable Email Permissions
- Look for **"API Permissions"** or **"Scopes"** section
- Enable **"Email - Read"** permission
- This allows the app to read emails via IMAP

### 4. Update OAuth Scopes
The app now requests these scopes:
- `openid` - Basic authentication
- `email` - Access to email address
- `mail-r` - Read access to mail via IMAP

### 5. Test the Connection
After enabling the permissions:
1. Disconnect your Yahoo account in Zena Settings
2. Reconnect it (this will use the new permissions)
3. The sync should now work with your real Yahoo emails

## Alternative: App Password Method
If OAuth continues to fail, Yahoo also supports App Passwords:

1. Go to Yahoo Account Security: https://login.yahoo.com/account/security
2. Generate an App Password for "Mail"
3. Use this 16-character password instead of OAuth

However, OAuth is the preferred method for security.

## Current App Configuration
- **App ID**: `tWsPjqmA`
- **Client ID**: `dj0yJmk9SU1LOHBXV0xxNFFjJmQ9WVdrOWRGZHpVR3B4YlVFbWNHbzlNQT09JnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PTIz`
- **Redirect URI**: `https://tarnishable-elenor-unmedicinal.ngrok-free.dev/api/accounts/email/callback`
- **Required Permissions**: Profile - OpenID Connect + **Email - Read**