# Test Environment Setup Checklist

Use this checklist to verify your test environment is ready.

## ✅ Setup Checklist

### 1. Files Created
- [ ] `.env.test` - Test environment configuration
- [ ] `src/test/setup.ts` - Enhanced test setup with database hooks
- [ ] `vitest.config.ts` - Updated with test configuration
- [ ] `scripts/setup-test-db.sh` - Database setup helper script
- [ ] `src/test/database.test.ts` - Example database test

### 2. Dependencies
- [ ] Run `npm install` to install new dependencies
  - Installs `dotenv-cli` for environment management
  - Ensures all test dependencies are available

### 3. Database Configuration
- [ ] PostgreSQL is installed and running
  ```bash
  pg_isready
  ```
- [ ] Update `.env.test` with your PostgreSQL credentials
  ```
  DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/zena_test
  ```
- [ ] Test database `zena_test` is created
  ```bash
  psql -U postgres -l | grep zena_test
  ```

### 4. Database Setup
- [ ] Run database setup script
  ```bash
  npm run test:db:setup
  ```
  Choose option 5 for full setup
  
  OR manually:
  ```bash
  # Create database
  psql -U postgres -c "CREATE DATABASE zena_test;"
  
  # Run migrations
  npm run test:db:migrate
  
  # (Optional) Seed data
  npm run test:db:seed
  ```

### 5. Verify Setup
- [ ] Run database connection test
  ```bash
  npm test -- src/test/database.test.ts
  ```
  Expected output:
  ```
  ✓ Database Test Setup (4)
    ✓ should connect to test database
    ✓ should use test database URL
    ✓ should have NODE_ENV set to test
    ✓ should be able to query database schema
  ```

### 6. Run All Tests
- [ ] Run full test suite
  ```bash
  npm test
  ```
  All tests should pass!

## 🎯 Quick Commands Reference

```bash
# First time setup
npm install
npm run test:db:setup  # Choose option 5

# Run tests
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage

# Database management
npm run test:db:migrate     # Run migrations
npm run test:db:reset       # Reset database
npm run test:db:seed        # Seed data
```

## 🔍 Verification Steps

### Step 1: Check PostgreSQL
```bash
pg_isready
# Expected: accepting connections
```

### Step 2: Check Database Exists
```bash
psql -U postgres -l | grep zena_test
# Expected: zena_test | ...
```

### Step 3: Check Environment
```bash
cat packages/backend/.env.test | grep DATABASE_URL
# Expected: DATABASE_URL=postgresql://...zena_test
```

### Step 4: Test Database Connection
```bash
npm test -- src/test/database.test.ts
# Expected: All tests pass
```

### Step 5: Run Full Test Suite
```bash
npm test
# Expected: All tests pass
```

## ❌ Troubleshooting

### Issue: "Database does not exist"
**Solution:**
```bash
psql -U postgres -c "CREATE DATABASE zena_test;"
npm run test:db:migrate
```

### Issue: "Connection refused"
**Solution:**
1. Check PostgreSQL is running: `pg_isready`
2. Verify credentials in `.env.test`
3. Test connection: `psql -U YOUR_USER -d zena_test`

### Issue: "Migration failed"
**Solution:**
```bash
# Reset and try again
npm run test:db:reset
```

### Issue: "dotenv-cli not found"
**Solution:**
```bash
npm install
```

### Issue: "Tests timeout"
**Solution:**
- Increase timeout in `vitest.config.ts` (currently 10000ms)
- Check database connection is stable
- Verify no other process is locking the database

## 📚 Documentation

- **Quick Start**: `TESTING_QUICK_START.md`
- **Full Guide**: `TEST_DATABASE_SETUP.md`
- **Setup Complete**: `TEST_SETUP_COMPLETE.md`
- **Auth Tests**: `TEST_INSTRUCTIONS.md`

## ✨ What's Next?

Once all checkboxes are complete:

1. ✅ Test environment is ready
2. ✅ Database tests can run
3. ✅ Property-based tests are configured
4. ➡️ Start writing tests for your features!

---

**Need Help?**

- Check `TESTING_QUICK_START.md` for common commands
- See `TEST_DATABASE_SETUP.md` for detailed troubleshooting
- Review example test in `src/test/database.test.ts`
