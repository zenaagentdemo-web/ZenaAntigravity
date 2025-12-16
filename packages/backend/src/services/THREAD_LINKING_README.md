# Thread Linking Service

## Overview

The Thread Linking Service automatically links email threads to properties and contacts based on:
- **Property Linking**: Matches threads to properties by detecting address mentions in thread subjects and summaries
- **Contact Linking**: Matches threads to contacts by comparing participant emails with contact email addresses

## Features

### Automatic Linking

When threads are synced from email providers, the service automatically:
1. Searches for property address mentions in the thread content
2. Links the thread to the matching property (if found)
3. Identifies contacts that match thread participants by email
4. Returns the linked property ID and contact IDs

### Address Matching

The service uses fuzzy matching to handle variations in address formatting:
- Direct full address matches
- Partial matches (street number + street name)
- Case-insensitive matching

Examples:
- "123 Main Street, Sydney" matches "About 123 Main Street"
- "456 Oak Ave" matches "RE: 456 Oak viewing"

### Contact Matching

Contacts are matched by email address:
- Case-insensitive email comparison
- Supports multiple emails per contact
- Returns all matching contact IDs

## Usage

### Automatic Linking During Sync

The sync engine automatically calls the linking service for each thread:

```typescript
// In sync-engine.service.ts
await threadLinkingService.autoLinkThread(threadId);
```

### Manual Linking

You can manually trigger linking for a specific thread:

```typescript
import { threadLinkingService } from './thread-linking.service.js';

// Link a single thread
const result = await threadLinkingService.autoLinkThread(threadId);
console.log('Linked to property:', result.propertyId);
console.log('Linked to contacts:', result.contactIds);
```

### Re-linking After Property Creation

When a new property is created, you can re-link all existing threads:

```typescript
// Re-link all threads that mention this property
const linkedCount = await threadLinkingService.relinkThreadsForProperty(propertyId);
console.log(`Linked ${linkedCount} threads to property`);
```

### Batch Linking

Link multiple threads at once:

```typescript
const threadIds = ['thread-1', 'thread-2', 'thread-3'];
await threadLinkingService.batchLinkThreads(threadIds);
```

### Query Threads by Entity

Get all threads for a specific property:

```typescript
const threads = await threadLinkingService.getThreadsForProperty(propertyId);
```

Get all threads involving a specific contact:

```typescript
const threads = await threadLinkingService.getThreadsForContact(contactId);
```

## API Methods

### `autoLinkThread(threadId: string)`

Automatically links a thread to properties and contacts.

**Returns:**
```typescript
{
  propertyId: string | null;  // ID of linked property (if found)
  contactIds: string[];       // IDs of matching contacts
}
```

### `linkThreadToProperty(threadId, userId, subject, summary)`

Links a thread to a property by searching for address mentions.

**Returns:** `string | null` - Property ID if match found

### `findContactsForThread(userId, participants)`

Finds contacts matching thread participants by email.

**Returns:** `string[]` - Array of contact IDs

### `relinkThreadsForProperty(propertyId)`

Re-links all threads that mention a specific property.

**Returns:** `number` - Count of threads linked

### `batchLinkThreads(threadIds)`

Links multiple threads in batch.

**Returns:** `Promise<void>`

### `getThreadsForProperty(propertyId)`

Gets all threads linked to a property.

**Returns:** Array of thread objects

### `getThreadsForContact(contactId)`

Gets all threads involving a contact (by participant email).

**Returns:** Array of thread objects

## Integration Points

### 1. Sync Engine

The sync engine calls `autoLinkThread()` after storing each thread:

```typescript
// After creating/updating thread
await threadLinkingService.autoLinkThread(threadId);
```

### 2. Property Creation

When a property is manually added, re-link existing threads:

```typescript
// After creating property
const linkedCount = await threadLinkingService.relinkThreadsForProperty(property.id);
```

### 3. Contact Views

When displaying a contact, show their threads:

```typescript
const threads = await threadLinkingService.getThreadsForContact(contactId);
```

### 4. Property Views

When displaying a property, show related threads:

```typescript
const threads = await threadLinkingService.getThreadsForProperty(propertyId);
```

## Requirements Validation

This service implements:

- **Requirement 3.4**: Links threads that reference the same property or contact
- **Requirement 7.3**: Attaches email threads that mention a property address
- **Requirement 11.3**: Automatically links threads when property address is added

## Property-Based Testing

The service includes comprehensive unit tests covering:
- Property linking with full and partial address matches
- Contact linking by email (case-insensitive)
- Automatic linking during sync
- Re-linking after property creation
- Querying threads by property and contact

## Error Handling

The service handles errors gracefully:
- Logs errors but doesn't fail the sync process
- Returns null/empty arrays when no matches found
- Validates that entities exist before linking

## Performance Considerations

- Uses database indexes on `propertyId`, `userId`, and `emails` fields
- Batch operations for multiple threads
- Efficient fuzzy matching algorithm
- Minimal database queries per thread
