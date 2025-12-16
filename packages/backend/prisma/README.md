# Zena Database Schema

This directory contains the Prisma schema and migrations for the Zena AI Real Estate PWA.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your PostgreSQL database and update the `DATABASE_URL` in your `.env` file:
```
DATABASE_URL="postgresql://user:password@localhost:5432/zena"
```

3. Generate Prisma Client:
```bash
npm run db:generate
```

4. Create and apply migrations:
```bash
npm run db:migrate
```

Or for development, push schema directly without migrations:
```bash
npm run db:push
```

## Available Scripts

- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema to database (development)
- `npm run db:migrate` - Create and apply migrations (production)
- `npm run db:studio` - Open Prisma Studio (database GUI)

## Schema Overview

### Core Models

- **User** - Agent accounts with authentication
- **EmailAccount** - Connected email accounts (Gmail, Outlook, etc.)
- **CalendarAccount** - Connected calendar accounts
- **Thread** - Email conversations with AI classification
- **Contact** - Deduplicated contacts from communications
- **Property** - Real estate properties being tracked
- **Deal** - Transaction opportunities with stage tracking
- **TimelineEvent** - Activity history for entities
- **Task** - Action items extracted from communications
- **VoiceNote** - Transcribed voice recordings
- **CRMIntegration** - Third-party CRM connections
- **Export** - Data export jobs

### Key Features

- **Automatic deduplication** - Contacts are merged by email
- **Risk tracking** - Deals and threads have risk levels
- **Stage progression** - Deals move through sales stages
- **Entity linking** - Threads link to properties, contacts, and deals
- **Timeline tracking** - All activities are recorded chronologically
- **Encrypted credentials** - OAuth tokens and API keys are encrypted

### Indexes

Performance indexes are created on:
- User email (unique)
- Foreign keys (userId, emailAccountId, etc.)
- Query fields (category, classification, riskLevel, status)
- Timestamp fields (lastMessageAt, timestamp, dueDate)
- Search fields (emails, address)

## Data Model Relationships

```
User
├── EmailAccount (1:many)
├── CalendarAccount (1:many)
├── Thread (1:many)
│   ├── Property (many:1)
│   └── Deal (many:1)
├── Contact (1:many)
│   ├── Deal (many:many)
│   ├── Property as Vendor (many:many)
│   └── Property as Buyer (many:many)
├── Property (1:many)
│   ├── Thread (1:many)
│   └── Deal (1:many)
├── Deal (1:many)
│   ├── Contact (many:many)
│   └── Thread (1:many)
├── TimelineEvent (1:many)
├── Task (1:many)
├── VoiceNote (1:many)
├── CRMIntegration (1:many)
└── Export (1:many)
```

## Migration Strategy

For production deployments:
1. Create migration: `npm run db:migrate`
2. Review generated SQL in `prisma/migrations/`
3. Test migration on staging database
4. Apply to production

For development:
- Use `npm run db:push` for rapid iteration
- Schema changes are applied directly without migration files
