// Test setup file
import { config } from 'dotenv';
import { resolve } from 'path';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import prisma from '../config/database';

// Load test environment variables
config({ path: resolve(__dirname, '../../.env.test') });

// Ensure we're in test mode
if (process.env.NODE_ENV !== 'test') {
  process.env.NODE_ENV = 'test';
}

// Global test setup
beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

// Clean up after all tests
afterAll(async () => {
  // Disconnect from database
  await prisma.$disconnect();
});

// Optional: Clean database before each test
// Uncomment if you want a fresh database state for each test
// beforeEach(async () => {
//   // Clean all tables (be careful with this in production!)
//   const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
//     SELECT tablename FROM pg_tables WHERE schemaname='public'
//   `;
//   
//   for (const { tablename } of tablenames) {
//     if (tablename !== '_prisma_migrations') {
//       try {
//         await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
//       } catch (error) {
//         console.log(`Error truncating ${tablename}:`, error);
//       }
//     }
//   }
// });
