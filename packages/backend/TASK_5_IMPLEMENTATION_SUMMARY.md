# Task 5 Implementation Summary: OAuth Flow for Calendar Providers

## Overview
Implemented OAuth 2.0 authentication flow for Google Calendar and Microsoft Calendar providers, enabling users to connect their calendar accounts to Zena.

## Components Implemented

### 1. OAuth Service Extension (`src/services/oauth.service.ts`)
- Added Google Calendar OAuth configuration
  - Authorization URL: `https://accounts.google.com/o/oauth2/v2/auth`
  - Token URL: `https://oauth2.googleapis.com/token`
  - Scopes: `calendar.readonly`, `calendar.events.readonly`, `userinfo.email`
  
- Added Microsoft Calendar OAuth configuration
  - Authorization URL: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
  - Token URL: `https://login.microsoftonline.com/common/oauth2/v2.0/token`
  - Scopes: `Calendars.Read`, `User.Read`, `offline_access`

- Updated `getUserEmail()` method to support calendar providers
- Renamed `getGmailUserEmail()` to `getGoogleUserEmail()` for consistency

### 2. Calendar Account Service (`src/services/calendar-account.service.ts`)
Created comprehensive service for calendar account management:

**Functions:**
- `createCalendarAccount()` - Create or update calendar account with encrypted tokens
- `getCalendarAccountsByUserId()` - Retrieve all calendar accounts for a user
- `getCalendarAccountById()` - Get specific calendar account
- `disconnectCalendarAccount()` - Remove calendar account connection
- `getDecryptedTokens()` - Retrieve decrypted access/refresh tokens
- `updateCalendarAccountTokens()` - Update tokens after refresh
- `mapProviderToDbFormat()` - Map OAuth provider names to database format

**Features:**
- Automatic token encryption using existing encryption utilities
- Provider name mapping (google-calendar → google, microsoft-calendar → microsoft)
- Duplicate account detection and update
- Token expiry calculation

### 3. Calendar Account Controller (`src/controllers/calendar-account.controller.ts`)
Implemented REST API endpoints:

**Endpoints:**
- `POST /api/accounts/calendar/connect` - Initiate OAuth flow
  - Validates provider
  - Generates secure state parameter with CSRF protection
  - Returns authorization URL
  
- `POST /api/accounts/calendar/callback` - Handle OAuth callback
  - Validates state parameter (10-minute expiry)
  - Exchanges authorization code for tokens
  - Retrieves user email from provider
  - Creates/updates calendar account
  
- `GET /api/accounts/calendar` - List connected calendar accounts
  - Returns all calendar accounts for authenticated user
  
- `DELETE /api/accounts/calendar/:id` - Disconnect calendar account
  - Verifies account ownership
  - Removes account from database

**Error Handling:**
- Structured error responses with error codes
- CSRF protection via state validation
- User authentication verification
- Provider validation

### 4. Routes Configuration (`src/routes/calendar-account.routes.ts`)
- Created Express router with authentication middleware
- Registered all calendar account endpoints
- Integrated with main application in `src/index.ts`

### 5. Environment Configuration (`.env.example`)
Added calendar OAuth configuration variables:
```
GOOGLE_CALENDAR_CLIENT_ID
GOOGLE_CALENDAR_CLIENT_SECRET
GOOGLE_CALENDAR_REDIRECT_URI
MICROSOFT_CALENDAR_CLIENT_ID
MICROSOFT_CALENDAR_CLIENT_SECRET
MICROSOFT_CALENDAR_REDIRECT_URI
```

Note: Can reuse Google/Microsoft credentials if using the same OAuth app

### 6. Unit Tests (`src/services/calendar-account.service.test.ts`)
Comprehensive test coverage including:

**Unit Tests:**
- Create new calendar account
- Update existing calendar account
- Get calendar accounts by user ID
- Disconnect calendar account
- Error handling for non-existent accounts
- Get decrypted tokens
- Update calendar account tokens
- Provider name mapping (google-calendar → google, microsoft-calendar → microsoft)

**Test Framework:** Vitest with mocked Prisma client and encryption utilities

## Database Schema
Uses existing `CalendarAccount` model from Prisma schema:
```prisma
model CalendarAccount {
  id           String   @id @default(uuid())
  userId       String
  provider     String   // 'google' | 'microsoft' | 'icloud'
  email        String
  accessToken  String   // encrypted
  refreshToken String   // encrypted
  tokenExpiry  DateTime
  lastSyncAt   DateTime?
  syncEnabled  Boolean  @default(true)
  createdAt    DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Security Features
1. **Token Encryption**: All access and refresh tokens encrypted before storage
2. **CSRF Protection**: State parameter with timestamp validation
3. **Authentication Required**: All endpoints protected by JWT middleware
4. **User Verification**: Callback validates user matches authenticated session
5. **State Expiry**: OAuth state expires after 10 minutes
6. **HTTPS/TLS**: All OAuth flows use secure HTTPS connections

## API Flow

### Connection Flow:
1. Client calls `POST /api/accounts/calendar/connect` with provider
2. Server generates authorization URL with state
3. Client redirects user to provider's OAuth page
4. User authorizes Zena
5. Provider redirects to callback URL with code
6. Client calls `POST /api/accounts/calendar/callback` with code and state
7. Server exchanges code for tokens
8. Server stores encrypted tokens in database
9. Returns success with account details

### Token Refresh Flow (for future implementation):
1. Detect expired token
2. Use refresh token to get new access token
3. Update stored tokens via `updateCalendarAccountTokens()`

## Requirements Validated
✅ **Requirement 4.1**: WHEN an Agent connects their calendar THEN the System SHALL support Google Calendar with OAuth authentication

## Next Steps
- Task 6: Build email synchronization engine
- Task 7: Build calendar synchronization engine (will use these OAuth tokens)
- Implement automatic token refresh logic
- Add calendar event fetching and parsing

## Files Created/Modified

### Created:
- `packages/backend/src/services/calendar-account.service.ts`
- `packages/backend/src/services/calendar-account.service.test.ts`
- `packages/backend/src/controllers/calendar-account.controller.ts`
- `packages/backend/src/routes/calendar-account.routes.ts`
- `packages/backend/TASK_5_IMPLEMENTATION_SUMMARY.md`

### Modified:
- `packages/backend/src/services/oauth.service.ts`
- `packages/backend/src/index.ts`
- `packages/backend/.env.example`

## Testing
Run tests with:
```bash
cd packages/backend
npm test src/services/calendar-account.service.test.ts
```

## Notes
- Google Calendar and Microsoft Calendar OAuth configurations can reuse the same OAuth app credentials as Gmail/Outlook if desired
- The implementation follows the same pattern as email account OAuth for consistency
- Provider names are mapped internally (google-calendar → google) to match database schema
- All tokens are encrypted using the existing encryption utility
- The service is ready for integration with the calendar sync engine (Task 7)

