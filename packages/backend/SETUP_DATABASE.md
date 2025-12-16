# Database Setup Instructions

## Prerequisites

1. Install Node.js (v18 or higher)
2. Install PostgreSQL (v14 or higher)
3. Ensure npm is available in your PATH

## Installation Steps

### 1. Install Dependencies

From the backend directory:
```bash
cd packages/backend
npm install
```

Or from the root directory:
```bash
npm install
```

### 2. Configure Database

Create a PostgreSQL database:
```bash
createdb zena
```

Or using psql:
```sql
CREATE DATABASE zena;
```

### 3. Set Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Update the `DATABASE_URL` in `.env`:
```
DATABASE_URL="postgresql://username:password@localhost:5432/zena"
```

Replace `username` and `password` with your PostgreSQL credentials.

### 4. Generate Prisma Client

```bash
npm run db:generate
```

This generates the TypeScript types and Prisma Client based on the schema.

### 5. Apply Database Schema

For development (no migration files):
```bash
npm run db:push
```

For production (with migration files):
```bash
npm run db:migrate
```

### 6. Verify Setup

Open Prisma Studio to view your database:
```bash
npm run db:studio
```

This will open a browser interface at http://localhost:5555

## Troubleshooting

### Connection Issues

If you get connection errors:
1. Verify PostgreSQL is running: `pg_isready`
2. Check your DATABASE_URL format
3. Ensure the database exists: `psql -l`
4. Test connection: `psql -d zena`

### Permission Issues

If you get permission errors:
1. Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE zena TO your_user;`
2. Ensure your user has CREATE privileges

### Schema Sync Issues

If schema is out of sync:
1. Reset database: `npm run db:push -- --force-reset`
2. Or drop and recreate: `dropdb zena && createdb zena && npm run db:push`

## Next Steps

After database setup:
1. Start the development server: `npm run dev`
2. The API will be available at http://localhost:3000
3. Database models are available via `import { prisma } from '@/models'`

## Schema Updates

When modifying the schema:

1. Edit `prisma/schema.prisma`
2. Generate client: `npm run db:generate`
3. Apply changes: `npm run db:push` (dev) or `npm run db:migrate` (prod)
4. Commit migration files to version control

## Production Deployment

For production:
1. Use `npm run db:migrate` to create migration files
2. Review generated SQL in `prisma/migrations/`
3. Test on staging environment
4. Apply to production database
5. Never use `db:push` in production
