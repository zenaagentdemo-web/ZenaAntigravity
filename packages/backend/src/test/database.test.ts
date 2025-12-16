import { describe, it, expect, beforeAll } from 'vitest';
import prisma from '../config/database';

/**
 * Example test to verify database connection and test setup
 * This test demonstrates that the test environment is properly configured
 */
describe('Database Test Setup', () => {
  beforeAll(async () => {
    // Verify database connection
    await prisma.$connect();
  });

  it('should connect to test database', async () => {
    // Simple query to verify connection
    const result = await prisma.$queryRaw`SELECT 1 as value`;
    expect(result).toBeDefined();
  });

  it('should use test database URL', () => {
    // Verify we're using the test database
    const dbUrl = process.env.DATABASE_URL || '';
    expect(dbUrl).toContain('zena_test');
  });

  it('should have NODE_ENV set to test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should be able to query database schema', async () => {
    // Query to check if we can access database metadata
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname='public'
      LIMIT 5
    `;
    
    expect(Array.isArray(tables)).toBe(true);
  });
});
