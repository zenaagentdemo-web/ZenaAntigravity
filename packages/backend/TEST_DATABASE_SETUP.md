# Test Database Setup

This guide explains how to set up and use the test database for running tests.

## Overview

The test environment uses a separate PostgreSQL database (`zena_test`) to avoid interfering with your development data.

## Prerequisites

- PostgreSQL installed and running
- Node.js and npm installed
- Prisma CLI installed (`npm install -g prisma` or use `npx prisma`)

## Setup Steps

### 1. Create Test Database

Connect to PostgreSQL and create the test database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create test database
CREATE DATABASE zena_test;

# Create user if needed (use same credentials as .env.test)
CREATE USER user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE zena_test TO user;

# Exit psql
\q
```

### 2. Configure Test Environment

The `.env.test` file has been created with test-specific configuration:

```
DATABASE_URL=postgresql://user:password@localhost:5432/zena_test
```

**Important:** Update the DATABASE_URL in `.env.test` if your PostgreSQL credentials differ.

### 3. Run Migrations on Test Database

Apply the database schema to your test database:

```bash
# Set environment to test
export NODE_ENV=test

# Run migrations using the test database URL
DATABASE_URL="postgresql://user:password@localhost:5432/zena_test" npx prisma migrate deploy

# Or use the .env.test file
dotenv -e .env.test -- npx prisma migrate deploy
```

### 4. (Optional) Seed Test Data

If you want to seed the test database with initial data:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/zena_test" npx prisma db seed
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
npm test -- path/to/test.file.test.ts
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

## Test Database Management

### Reset Test Database

To completely reset the test database:

```bash
# Drop and recreate
DATABASE_URL="postgresql://user:password@localhost:5432/zena_test" npx prisma migrate reset --force

# Or manually
psql -U postgres -c "DROP DATABASE zena_test;"
psql -U postgres -c "CREATE DATABASE zena_test;"
DATABASE_URL="postgresql://user:password@localhost:5432/zena_test" npx prisma migrate deploy
```

### Clean Test Data Between Tests

The test setup file (`src/test/setup.ts`) includes commented code for cleaning tables between tests. Uncomment the `beforeEach` block if you need this behavior:

```typescript
beforeEach(async () => {
  // Clean all tables
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;
  
  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
    }
  }
});
```

## Environment Variables

The `.env.test` file contains test-specific configuration:

- **DATABASE_URL**: Points to `zena_test` database
- **PORT**: Uses 3001 to avoid conflicts
- **LOG_LEVEL**: Set to `error` to reduce test output noise
- **Mock credentials**: All API keys and secrets use test values

## Troubleshooting

### Connection Errors

If you get connection errors:

1. Verify PostgreSQL is running: `pg_isready`
2. Check credentials in `.env.test` match your PostgreSQL setup
3. Ensure the `zena_test` database exists: `psql -U postgres -l`

### Migration Errors

If migrations fail:

1. Check that migrations exist: `ls prisma/migrations`
2. Try resetting: `DATABASE_URL="..." npx prisma migrate reset --force`
3. Verify schema: `DATABASE_URL="..." npx prisma db push`

### Test Timeouts

If tests timeout:

1. Increase timeout in `vitest.config.ts` (currently 10000ms)
2. Check database connection is working
3. Verify test database isn't locked by another process

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Clean up test data after tests (use `afterEach` or `afterAll`)
3. **Transactions**: Consider using database transactions for test isolation
4. **Mocking**: Mock external services (APIs, email, etc.) in tests
5. **Speed**: Keep tests fast by minimizing database operations

## CI/CD Integration

For continuous integration, you can use environment variables:

```yaml
# Example GitHub Actions
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/zena_test
  NODE_ENV: test
```

## Docker Setup (Optional)

To run tests in Docker with an isolated database:

```bash
# Start test database
docker run -d \
  --name zena-test-db \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=zena_test \
  -p 5433:5432 \
  postgres:15

# Update .env.test to use port 5433
DATABASE_URL=postgresql://user:password@localhost:5433/zena_test

# Run tests
npm test

# Stop and remove container
docker stop zena-test-db
docker rm zena-test-db
```
