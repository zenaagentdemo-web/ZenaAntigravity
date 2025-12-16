# Database Quick Start Guide

## Prerequisites Checklist

- [ ] Node.js v18+ installed
- [ ] PostgreSQL v14+ installed and running
- [ ] Database created (e.g., `createdb zena`)
- [ ] Environment variables configured in `.env`

## Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and set DATABASE_URL
```

Example DATABASE_URL:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/zena"
```

### 3. Initialize Database
```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Seed with demo data
npm run db:seed
```

### 4. Verify Setup
```bash
# Open Prisma Studio
npm run db:studio
```

Visit http://localhost:5555 to browse your database.

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate Prisma Client from schema |
| `npm run db:push` | Push schema changes to database (dev) |
| `npm run db:migrate` | Create and apply migrations (prod) |
| `npm run db:studio` | Open database GUI |
| `npm run db:seed` | Populate with demo data |

## Database Schema Summary

### Core Tables
- **users** - Agent accounts
- **email_accounts** - Connected email providers
- **calendar_accounts** - Connected calendars
- **threads** - Email conversations
- **contacts** - Deduplicated people
- **properties** - Real estate listings
- **deals** - Transaction opportunities
- **timeline_events** - Activity history
- **tasks** - Action items
- **voice_notes** - Transcribed recordings
- **crm_integrations** - Third-party CRM connections
- **exports** - Data export jobs

### Key Relationships
```
User → EmailAccount → Thread → Property
                    ↓         ↓
                   Deal ← Contact
```

## Usage in Code

### Import Models
```typescript
import { prisma } from '@/models';
```

### Query Example
```typescript
const threads = await prisma.thread.findMany({
  where: { userId, category: 'focus' },
  include: { property: true },
  take: 10,
});
```

### Helper Functions
```typescript
import { 
  findOrCreateContact,
  getFocusThreads,
  createTimelineEvent 
} from '@/utils/database';
```

## Troubleshooting

### "Can't reach database server"
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env`
- Test connection: `psql -d zena`

### "Schema out of sync"
```bash
npm run db:push -- --force-reset
```

### "Prisma Client not generated"
```bash
npm run db:generate
```

### Reset Database
```bash
dropdb zena && createdb zena && npm run db:push && npm run db:seed
```

## Next Steps

1. ✅ Database schema implemented
2. ⏭️ Implement authentication endpoints (Task 3)
3. ⏭️ Implement OAuth flows (Task 4)
4. ⏭️ Build sync engines (Tasks 6-7)

## Documentation

- Full schema: `prisma/schema.prisma`
- Model types: `src/models/types.ts`
- Utilities: `src/utils/database.ts`
- Validation: `src/utils/validation.ts`
- Setup guide: `SETUP_DATABASE.md`
- Model docs: `src/models/README.md`

## Demo Data

After running `npm run db:seed`:
- **User**: demo@zena.ai / demo123
- **Property**: 123 Main Street, Sydney
- **Contacts**: John Smith (buyer), Sarah Johnson (vendor)
- **Deal**: Viewing stage
- **Task**: Send contract to buyer

Login with demo credentials to explore the system.
