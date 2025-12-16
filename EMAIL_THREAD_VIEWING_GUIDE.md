# Email Thread Viewing Guide

## Overview

Zena now stores and displays full email messages, not just AI summaries! You can view complete email threads with all messages, including sender, recipients, timestamps, and full message content.

## What's New

### 1. Message Storage
- **Database Model**: Added `Message` model to store individual email messages
- **Fields Stored**:
  - From, To, CC recipients
  - Subject and body (plain text and HTML)
  - Sent and received timestamps
  - Flag indicating if message is from you

### 2. IMAP Integration
- **Full IMAP Support**: Implemented complete IMAP connector using `imap` and `mailparser` libraries
- **Yahoo Mail**: Configured for Yahoo Mail (can be extended to other IMAP providers)
- **Message Threading**: Automatically groups messages into threads based on subject

### 3. UI Updates
- **Thread Detail Page**: Added "View Full Email Thread" button
- **Message Display**: Shows all messages in chronological order
- **Visual Distinction**: Your messages are highlighted in blue
- **Rich Content**: Supports both plain text and HTML email bodies

## How to Use

### Step 1: Connect Your Yahoo Mail Account

1. **Generate Yahoo App Password**:
   - Go to https://login.yahoo.com/account/security
   - Click "Generate app password"
   - Select "Other App" and name it "Zena"
   - Copy the 16-character password

2. **Update .env File**:
   ```bash
   # Edit packages/backend/.env
   YAHOO_EMAIL=your-email@yahoo.com
   YAHOO_APP_PASSWORD=your-16-char-app-password
   YAHOO_IMAP_HOST=imap.mail.yahoo.com
   YAHOO_IMAP_PORT=993
   ```

3. **Test Connection**:
   ```bash
   cd packages/backend
   npm run test:yahoo
   ```
   
   You should see:
   ```
   ✅ Successfully connected to Yahoo IMAP!
   📬 INBOX Information:
      Total messages: X
      New messages: Y
   ```

4. **Add Account to Database**:
   ```bash
   npm run add:yahoo
   ```

### Step 2: Sync Emails

The sync engine will automatically fetch emails every 5 minutes. To trigger a manual sync:

1. **Restart Backend** (if it's running):
   ```bash
   # In packages/backend
   npm run dev
   ```

2. **Wait for Sync**: The sync engine will:
   - Connect to your Yahoo IMAP
   - Fetch new emails
   - Store individual messages
   - Group them into threads
   - Run AI classification

3. **Check Logs**: You'll see output like:
   ```
   Fetching emails via IMAP from: imap.mail.yahoo.com
   Fetched 15 messages from IMAP
   Grouped into 8 threads
   ```

### Step 3: View Full Email Threads

1. **Navigate to Focus or Waiting Page**
2. **Click on a Thread** (View & Edit or Follow Up)
3. **Click "View Full Email Thread" Button**
4. **See All Messages**:
   - Messages are displayed in chronological order
   - Your messages have a blue background
   - Each message shows:
     - Sender name and email
     - Recipients (To and CC)
     - Timestamp
     - Full message body

## Technical Details

### Database Schema

```prisma
model Message {
  id          String   @id @default(uuid())
  threadId    String
  externalId  String   // provider's message ID
  from        Json     // { name: string, email: string }
  to          Json[]   // Array of recipients
  cc          Json[]   // Array of CC recipients
  subject     String
  body        String   @db.Text
  bodyHtml    String?  @db.Text
  sentAt      DateTime
  receivedAt  DateTime
  isFromUser  Boolean  @default(false)
  createdAt   DateTime @default(now())

  thread Thread @relation(fields: [threadId], references: [id])
}
```

### API Endpoints

- `GET /api/threads/:id/messages` - Fetch all messages for a thread

### IMAP Connector Features

- **Connection Management**: Handles IMAP connection lifecycle
- **Message Parsing**: Uses `mailparser` to parse email headers and body
- **Threading**: Groups messages by normalized subject
- **Error Handling**: Retry logic for network errors
- **Security**: Uses TLS encryption

## Troubleshooting

### No Messages Showing

**Possible Causes**:
1. Thread was created before message storage was enabled
2. Emails haven't been synced yet
3. IMAP connection failed

**Solutions**:
- Wait for next sync cycle (5 minutes)
- Check backend logs for sync errors
- Verify Yahoo credentials in .env
- Run `npm run test:yahoo` to test connection

### IMAP Connection Errors

**Common Issues**:
1. **Wrong credentials**: Double-check email and app password
2. **App password not generated**: Must use app password, not regular password
3. **IMAP not enabled**: Check Yahoo account settings

**Fix**:
- Regenerate app password at https://login.yahoo.com/account/security
- Ensure IMAP access is enabled in Yahoo settings
- Check firewall/network settings

### Messages Not Syncing

**Check**:
1. Backend server is running
2. Sync engine started (check logs for "Starting sync engine...")
3. Yahoo account added to database (`npm run add:yahoo`)
4. No errors in backend logs

## Future Enhancements

### Planned Features
- Support for Gmail and Outlook (already have OAuth connectors)
- Search within message content
- Message attachments display
- Reply directly from message view
- Mark messages as read/unread
- Archive/delete messages

### Other IMAP Providers
To add support for other IMAP providers (iCloud, custom domains):
1. Add provider-specific env variables
2. Update `fetchImapThreads` in sync-engine.service.ts
3. Add provider configuration to database

## Files Modified

### Backend
- `packages/backend/prisma/schema.prisma` - Added Message model
- `packages/backend/src/services/imap-connector.service.ts` - Full IMAP implementation
- `packages/backend/src/services/sync-engine.service.ts` - Store individual messages
- `packages/backend/src/controllers/threads.controller.ts` - Added getMessages endpoint
- `packages/backend/src/routes/threads.routes.ts` - Added /messages route

### Frontend
- `packages/frontend/src/pages/ThreadDetailPage/ThreadDetailPage.tsx` - Added message display
- `packages/frontend/src/pages/ThreadDetailPage/ThreadDetailPage.css` - Added message styles

### Scripts
- `packages/backend/scripts/test-yahoo-connection.ts` - Test IMAP connection
- `packages/backend/scripts/add-yahoo-account.ts` - Add account to database

## Support

If you encounter issues:
1. Check backend logs for errors
2. Verify .env configuration
3. Test IMAP connection: `npm run test:yahoo`
4. Check database: Ensure Message table exists and has data

---

**Note**: This feature requires the backend to be running and connected to your email account. The first sync may take a few minutes depending on the number of emails in your inbox.
