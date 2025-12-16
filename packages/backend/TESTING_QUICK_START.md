# Testing Quick Start Guide

Quick reference for running tests with the test database.

## First Time Setup

1. **Install dependencies** (includes dotenv-cli):
   ```bash
   npm install
   ```

2. **Configure test database URL** in `.env.test`:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/zena_test
   ```
   Update credentials to match your PostgreSQL setup.

3. **Create and setup test database**:
   ```bash
   npm run test:db:setup
   ```
   Choose option 5 for full setup (create + migrate + seed).

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/services/auth.service.test.ts
```

## Database Management

```bash
# Run migrations on test database
npm run test:db:migrate

# Reset test database (drop all data)
npm run test:db:reset

# Seed test database with data
npm run test:db:seed

# Interactive setup script
npm run test:db:setup
```

## Troubleshooting

### "Database does not exist"
```bash
# Create the database manually
psql -U postgres -c "CREATE DATABASE zena_test;"

# Then run migrations
npm run test:db:migrate
```

### "Connection refused"
- Ensure PostgreSQL is running: `pg_isready`
- Check credentials in `.env.test`

### "Migration failed"
```bash
# Reset and try again
npm run test:db:reset
```

## Environment Files

- `.env.test` - Test environment configuration (committed to repo)
- `.env.test.local` - Local overrides (gitignored, optional)

## Key Features

✅ Separate test database (`zena_test`)  
✅ Isolated test environment  
✅ Automatic database connection management  
✅ Mock credentials for external services  
✅ Reduced logging noise (LOG_LEVEL=error)  
✅ Property-based testing with fast-check  

## More Information

See `TEST_DATABASE_SETUP.md` for detailed documentation.
