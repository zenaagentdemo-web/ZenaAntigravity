# Test Instructions for Authentication System

> **📝 Note:** A complete test environment with database support has been set up!  
> See `TESTING_QUICK_START.md` for quick reference or `TEST_DATABASE_SETUP.md` for full documentation.

## Prerequisites

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Test Environment**
   
   The test environment is now fully configured! See `TESTING_QUICK_START.md` for details.
   
   ```bash
   # Quick setup (first time only)
   npm run test:db:setup
   # Choose option 5 for full setup
   ```
   
   Or manually:
   ```bash
   # 1. Configure .env.test (already created)
   # 2. Create test database
   psql -U postgres -c "CREATE DATABASE zena_test;"
   # 3. Run migrations
   npm run test:db:migrate
   ```

3. **Verify Setup**
   ```bash
   # Run the database connection test
   npm test -- src/test/database.test.ts
   ```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Authentication Tests Only
```bash
npm test -- auth --run
```

### Run Specific Test Files

**Property 80: Credential Encryption**
```bash
npm test -- src/services/auth.service.test.ts --run
```

**Property 81: Transport Security**
```bash
npm test -- src/middleware/auth.middleware.test.ts --run
```

### Run Tests in Watch Mode (for development)
```bash
npm test -- auth
```

## Expected Test Results

### Property 80: Credential Encryption
- ✅ Should never store passwords in plain text (100 iterations)
- ✅ Should produce different hashes for same password (100 iterations)
- ✅ Should ensure hash length and format consistency (100 iterations)
- ✅ Should handle edge cases in password encryption (100 iterations)

**Total: 400 test iterations**

### Property 81: Transport Security
- ✅ Should require Bearer token in Authorization header (100 iterations)
- ✅ Should accept only properly formatted Bearer tokens
- ✅ Should reject tokens not transmitted via Authorization header (100 iterations)
- ✅ Should ensure tokens are never exposed in responses (100 iterations)
- ✅ Should validate JWT tokens contain no sensitive data (100 iterations)

**Total: 400+ test iterations**

## Test Output Example

```
✓ AuthService Property-Based Tests
  ✓ Property 80: Credential encryption
    ✓ should never store passwords in plain text - all passwords must be hashed (100 runs)
    ✓ should produce different hashes for the same password (100 runs)
    ✓ should ensure hash length and format consistency (100 runs)
    ✓ should handle edge cases in password encryption (100 runs)

✓ Auth Middleware Property-Based Tests
  ✓ Property 81: Transport encryption
    ✓ should require Bearer token in Authorization header (100 runs)
    ✓ should accept only properly formatted Bearer tokens
    ✓ should reject tokens not transmitted via Authorization header (100 runs)
    ✓ should ensure tokens are never exposed in responses (100 runs)
    ✓ should validate JWT tokens contain no sensitive data (100 runs)

Test Files  2 passed (2)
Tests  9 passed (9)
```

## Troubleshooting

### "Cannot find module 'fast-check'"
```bash
npm install
```

### "Cannot connect to database"
The credential encryption tests (Property 80) don't require a database.
The transport security tests (Property 81) don't require a database.

Only integration tests that test the full registration/login flow require a database.

### "JWT_SECRET not defined"
Add to your `.env` file:
```bash
JWT_SECRET=your-secret-key-for-testing
```

### Tests are slow
Property-based tests run 100 iterations each by design. This is intentional to ensure thorough coverage.
To run fewer iterations during development, modify the `numRuns` parameter in the test files.

## Manual Testing

### Test Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "name": "Test User"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

### Test Protected Route
```bash
# Replace YOUR_TOKEN with the accessToken from login response
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Token Refresh
```bash
# Replace YOUR_REFRESH_TOKEN with the refreshToken from login response
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Run Authentication Tests
  run: npm test -- auth --run
```

## Coverage

To generate test coverage report:
```bash
npm test -- --coverage
```

## Next Steps

After tests pass:
1. ✅ Authentication system is working correctly
2. ✅ Passwords are encrypted with bcrypt
3. ✅ Transport security is properly configured
4. ➡️ Proceed to Task 4: OAuth flow implementation
