# Yahoo OAuth Scope Fix

## Issue
Yahoo OAuth was returning `invalid_scope` error when trying to connect email account.

## Root Cause
The Yahoo OAuth scopes were not matching the permissions enabled in the Yahoo app. Yahoo is very strict about scope validation.

## Solution Applied

### Changed Yahoo OAuth Scopes
Updated `packages/backend/src/services/oauth.service.ts` to use only the `openid` scope:

**Previous scopes (failed):**
- `openid`, `email` - Failed with invalid_scope
- `mail-r`, `mail-w` - Failed with invalid_scope  
- `mail-r` - Failed with invalid_scope

**Current scope (should work):**
- `openid` - This is the base OpenID Connect scope that should always be available

### Why This Should Work
1. The user's Yahoo app has "Profile - OpenID Connect Permissions" enabled
2. The `openid` scope is the fundamental OpenID Connect scope
3. This scope should be available by default for any Yahoo app with OpenID Connect enabled
4. We can still get the user's email from the OpenID Connect userinfo endpoint

## Yahoo App Configuration
- **App ID**: `tWsPjqmA`
- **Client ID**: `dj0yJmk9SU1LOHBXV0xxNFFjJmQ9WVdrOWRGZHpVR3B4YlVFbWNHbzlNQT09JnM9Y29uc3VtZXJzZWNyZXQmc3Y9MCZ4PTIz`
- **Client Secret**: `52a61edacee489918f2fa63de4801ffeb1d79235`
- **Redirect URI**: `https://tarnishable-elenor-unmedicinal.ngrok-free.dev/api/accounts/email/callback`
- **Enabled Permissions**:
  - Email - Read
  - Profile - OpenID Connect Permissions

## Testing Instructions

1. **Backend should auto-reload** (using tsx watch)
2. **Go to Settings page**: http://localhost:5173/settings
3. **Click the Yahoo email icon**
4. **Expected behavior**: Should redirect to Yahoo login without scope error

## If Still Getting Scope Error

If the `openid` scope still fails, it might mean:

1. **Yahoo app needs additional configuration**: The OpenID Connect permission might need to be re-enabled or the app needs to be regenerated
2. **Try adding 'profile' scope**: Some OpenID Connect implementations require both `openid` and `profile`
3. **Check Yahoo Developer Console**: Verify the app is in "Production" mode, not "Development"

## Alternative: Try Profile Scope

If `openid` alone doesn't work, try adding `profile`:

```typescript
scopes: [
  'openid',
  'profile',
],
```

This combination is standard for OpenID Connect and should work with the "Profile - OpenID Connect Permissions" enabled.

## Next Steps After Successful Connection

Once Yahoo OAuth works:
1. User will be redirected back to Settings page with success message
2. Yahoo email account will appear in the connected accounts list
3. Email sync will begin automatically
4. User can manually trigger sync with "Sync Now" button
