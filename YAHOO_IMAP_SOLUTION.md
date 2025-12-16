# Yahoo IMAP Authentication Issue - Solution

## Problem Identified
Yahoo OAuth2 works for basic authentication, but Yahoo's IMAP servers reject the OAuth2 tokens for IMAP access, even with "Email - Read" permissions enabled.

## Root Cause
Yahoo has **deprecated OAuth2 for IMAP access** and now requires **App Passwords** for third-party applications to access IMAP.

## Solution Options

### Option 1: Use Yahoo App Passwords (Recommended)
Yahoo's official recommendation is to use App Passwords for IMAP access:

1. **User goes to Yahoo Account Security**: https://account.yahoo.com/account/security
2. **Generates an App Password** specifically for "Mail" applications
3. **Uses the App Password** instead of OAuth for IMAP authentication

### Option 2: Yahoo Mail API (Limited)
Yahoo has a limited Mail API, but it's not publicly available for most developers.

### Option 3: Continue with OAuth + Manual IMAP Setup
Some users report success with OAuth + IMAP, but it requires:
- Specific Yahoo app configuration
- Additional permissions beyond "Email - Read"
- May not work consistently

## Recommended Implementation

**Hybrid Approach:**
1. **Keep OAuth** for user authentication and basic email info
2. **Prompt user for App Password** for IMAP access
3. **Store App Password securely** (encrypted) for IMAP sync

## User Instructions Needed

The user needs to:
1. **Go to Yahoo Account Security**: https://account.yahoo.com/account/security
2. **Click "Generate app password"**
3. **Select "Mail"** as the app type
4. **Copy the generated 16-character password**
5. **Enter it in Zena settings** for IMAP access

## Next Steps

1. **Update the UI** to request Yahoo App Password
2. **Modify sync engine** to use App Password for Yahoo IMAP
3. **Keep OAuth** for account verification and user info
4. **Provide clear instructions** to the user

This is the most reliable solution for Yahoo email integration.