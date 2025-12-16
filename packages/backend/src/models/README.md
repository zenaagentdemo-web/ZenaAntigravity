# Zena Database Models

This directory contains the database models and type definitions for the Zena AI Real Estate PWA.

## Overview

The application uses Prisma ORM with PostgreSQL for data persistence. All models are defined in `prisma/schema.prisma` and TypeScript types are generated automatically.

## Usage

### Importing Models

```typescript
import { prisma } from '@/models';
import type { User, Thread, Contact } from '@/models';
```

### Basic Operations

#### Create a User
```typescript
const user = await prisma.user.create({
  data: {
    email: 'agent@example.com',
    passwordHash: hashedPassword,
    name: 'John Agent',
    preferences: {
      notificationSettings: { enabled: true },
      voiceSettings: { sttProvider: 'openai' },
      uiSettings: { theme: 'auto' },
    },
  },
});
```

#### Query Threads
```typescript
const focusThreads = await prisma.thread.findMany({
  where: {
    userId: user.id,
    category: 'focus',
  },
  include: {
    property: true,
    deal: true,
  },
  orderBy: {
    lastMessageAt: 'desc',
  },
});
```

#### Create Contact with Deduplication
```typescript
import { findOrCreateContact } from '@/utils/database';

const contact = await findOrCreateContact(userId, {
  name: 'Jane Buyer',
  email: 'jane@example.com',
  phone: '+61400123456',
  role: 'buyer',
});
```

## Model Relationships

### User (1:many)
- EmailAccount
- CalendarAccount
- Thread
- Contact
- Property
- Deal
- TimelineEvent
- Task
- VoiceNote
- CRMIntegration
- Export

### Thread (many:1)
- User
- EmailAccount
- Property (optional)
- Deal (optional)

### Contact (many:many)
- Deal (through DealContacts)
- Property as Vendor (through VendorContacts)
- Property as Buyer (through BuyerContacts)

### Property (1:many)
- Thread
- Deal

### Deal (many:many)
- Contact (through DealContacts)

## Key Features

### Automatic Deduplication
Contacts are automatically deduplicated by email address using the `findOrCreateContact` utility.

### Risk Tracking
Threads and Deals have risk levels (none, low, medium, high) that are automatically updated based on communication patterns.

### Timeline Events
All significant activities are recorded as timeline events, providing a complete audit trail.

### Encrypted Fields
Sensitive fields like OAuth tokens and CRM credentials are stored encrypted (encryption handled at application layer).

## Utility Functions

See `src/utils/database.ts` for helper functions:

- `findOrCreateContact()` - Deduplicate contacts
- `linkThreadToProperty()` - Link threads to properties
- `getFocusThreads()` - Get agent's focus list
- `getWaitingThreads()` - Get waiting list
- `updateThreadRiskLevels()` - Update risk flags
- `createTimelineEvent()` - Record activity
- `getEntityTimeline()` - Get activity history
- `getOpenTasks()` - Get pending tasks
- `completeTask()` - Mark task complete
- `searchEntities()` - Search across all entities

## Validation

See `src/utils/validation.ts` for validation utilities:

- Enum validators (e.g., `isValidDealStage()`)
- Format validators (e.g., `isValidEmail()`)
- Structure validators (e.g., `validateParticipant()`)
- Sanitization functions (e.g., `sanitizeString()`)

## JSON Fields

Several models use JSON fields for flexible data:

### User.preferences
```typescript
{
  notificationSettings: {
    enabled: boolean;
    highPriorityThreads: boolean;
    riskDeals: boolean;
    calendarReminders: boolean;
    taskReminders: boolean;
  };
  voiceSettings: {
    sttProvider: 'openai' | 'google';
    ttsProvider: 'openai' | 'google';
    ttsVoice: string;
    autoPlayResponses: boolean;
  };
  uiSettings: {
    theme: 'light' | 'dark' | 'auto';
    focusListSize: number;
    defaultView: 'focus' | 'waiting' | 'ask_zena';
  };
}
```

### Thread.participants
```typescript
Array<{
  name: string;
  email: string;
  role?: 'buyer' | 'vendor' | 'agent' | 'lawyer' | 'broker' | 'other';
}>
```

### Contact.relationshipNotes
```typescript
Array<{
  id: string;
  content: string;
  source: 'email' | 'voice_note' | 'manual';
  createdAt: Date;
}>
```

### Property.milestones
```typescript
Array<{
  id: string;
  type: 'listing' | 'first_open' | 'offer_received' | 'conditional' | 'unconditional' | 'settled';
  date: Date;
  notes?: string;
}>
```

### VoiceNote.extractedEntities
```typescript
Array<{
  type: 'contact' | 'property' | 'task' | 'note';
  data: any;
  confidence: number;
}>
```

### CRMIntegration.syncConfig
```typescript
{
  syncContacts: boolean;
  syncProperties: boolean;
  syncDeals: boolean;
  syncDirection: 'push' | 'pull' | 'bidirectional';
}
```

## Performance Considerations

### Indexes
The schema includes indexes on:
- Foreign keys (userId, emailAccountId, etc.)
- Query fields (category, classification, riskLevel, status)
- Search fields (emails, address)
- Timestamp fields (lastMessageAt, timestamp, dueDate)

### Query Optimization
- Use `include` sparingly - only fetch related data when needed
- Use `select` to limit fields returned
- Use pagination for large result sets
- Use `findFirst` instead of `findMany` when expecting single result

### Example: Optimized Query
```typescript
const threads = await prisma.thread.findMany({
  where: { userId, category: 'focus' },
  select: {
    id: true,
    subject: true,
    summary: true,
    riskLevel: true,
    property: {
      select: {
        address: true,
      },
    },
  },
  take: 10,
});
```

## Testing

Models can be tested using the seed data:
```bash
npm run db:seed
```

This creates:
- Demo user (demo@zena.ai / demo123)
- Sample property
- Sample contacts (buyer and vendor)
- Sample deal
- Sample task
- Sample timeline event

## Migration Workflow

1. Edit `prisma/schema.prisma`
2. Generate client: `npm run db:generate`
3. Create migration: `npm run db:migrate`
4. Review SQL in `prisma/migrations/`
5. Test on staging
6. Deploy to production

## Common Patterns

### Creating a Deal with Contacts
```typescript
const deal = await prisma.deal.create({
  data: {
    userId,
    propertyId,
    stage: 'viewing',
    riskLevel: 'low',
    nextActionOwner: 'agent',
    summary: 'Buyer interested in property',
    contacts: {
      connect: [{ id: contactId }],
    },
  },
  include: {
    contacts: true,
    property: true,
  },
});
```

### Updating Thread with Property Link
```typescript
await prisma.thread.update({
  where: { id: threadId },
  data: {
    propertyId,
    classification: 'buyer',
    category: 'focus',
  },
});
```

### Querying with Multiple Filters
```typescript
const deals = await prisma.deal.findMany({
  where: {
    userId,
    stage: { in: ['viewing', 'offer'] },
    riskLevel: { not: 'none' },
  },
  include: {
    property: true,
    contacts: true,
  },
});
```

### Batch Operations
```typescript
await prisma.task.updateMany({
  where: {
    userId,
    status: 'open',
    dueDate: { lt: new Date() },
  },
  data: {
    // Mark overdue tasks
  },
});
```
